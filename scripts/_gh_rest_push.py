# -*- coding: utf-8 -*-
"""
GitHub REST git-data 推送脚本（绕过被掐的 github.com git 端点，走稳定 api.github.com）
流程: blobs(并发) -> 单棵 root tree(嵌套路径) -> commit -> refs/heads/main
历史折为 1 个 commit，代码完整。
用法: python _gh_rest_push.py <token> <owner> <repo> [工作目录]
"""
import base64, json, os, subprocess, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

TOKEN = sys.argv[1]
OWNER = sys.argv[2]
REPO = sys.argv[3]
WORKDIR = sys.argv[4] if len(sys.argv) > 4 else os.getcwd()
API = f"https://api.github.com/repos/{OWNER}/{REPO}"
HDRS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "baiju-rest-push",
}

def api(method, url, payload=None, retries=3):
    body = json.dumps(payload).encode() if payload is not None else None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, data=body, headers=HDRS, method=method)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            txt = e.read().decode()[:300]
            if e.code in (409, 422) and i < retries - 1:
                time.sleep(3); continue
            raise RuntimeError(f"{method} {url} -> {e.code} {txt}")
        except Exception as e:
            if i < retries - 1:
                time.sleep(2); continue
            raise

def create_blob(path):
    with open(path, "rb") as f:
        content = base64.b64encode(f.read()).decode()
    d = api("POST", f"{API}/git/blobs", {"content": content, "encoding": "base64"})
    return d["sha"], os.path.getsize(path)

def main():
    os.chdir(WORKDIR)
    # 0. 空仓库先建 init commit 使仓库有 HEAD（否则 blobs API 409 Git Repository is empty）
    try:
        br = api("GET", f"{API}/branches")
        if not br:
            print("[0/4] 空仓库, 先建 init commit", flush=True)
            t0 = api("POST", f"{API}/git/trees", {"tree": []})
            c0 = api("POST", f"{API}/git/commits", {"message": "init", "tree": t0["sha"], "parents": []})
            api("POST", f"{API}/git/refs", {"ref": "refs/heads/main", "sha": c0["sha"]})
            print(f"    init commit: {c0['sha']}", flush=True)
    except RuntimeError as e:
        print(f"    init 检查跳过: {str(e)[:120]}", flush=True)
    # 1. 清单: git ls-files -s -> "<mode> <sha> <stage>\t<path>"
    out = subprocess.run(["git", "ls-files", "-s"], capture_output=True, text=True).stdout
    entries = []
    for line in out.splitlines():
        # 格式: <mode> <sha> <stage>\t<path>
        if "\t" not in line:
            continue
        meta, path = line.split("\t", 1)
        parts = meta.split()
        if len(parts) < 3:
            continue
        mode = parts[0]
        path = path.strip()
        entries.append((mode, path))
    print(f"[1/4] 文件总数: {len(entries)}", flush=True)
    if not os.path.exists("./_gh_cred.txt"):
        pass  # token 走 argv
    # 2. 并发传 blob
    total = len(entries)
    blob_shas = {}
    done = 0
    fail = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        fut_map = {ex.submit(create_blob, p): (m, p) for m, p in entries}
        for fut in as_completed(fut_map):
            m, p = fut_map[fut]
            try:
                sha, size = fut.result()
                blob_shas[p] = (sha, m)
            except Exception as e:
                fail.append((p, str(e)))
            done += 1
            if done % 200 == 0 or done == total:
                print(f"    blob 进度: {done}/{total}", flush=True)
    if fail:
        print(f"[!!] {len(fail)} 个文件失败, 前5: {fail[:5]}", flush=True)
        sys.exit(2)
    print(f"[2/4] blob 全部完成 {total}", flush=True)
    # 3. 建 root tree (嵌套路径由 GitHub 自动处理; mode: 100644/100755/120000)
    tree = []
    for path in sorted(blob_shas):
        sha, mode = blob_shas[path]
        tree.append({"path": path.replace(os.sep, "/"), "mode": mode, "type": "blob", "sha": sha})
    print(f"[3/4] 建 root tree, {len(tree)} 条", flush=True)
    d = api("POST", f"{API}/git/trees", {"tree": tree})
    root_sha = d["sha"]
    print(f"    root tree: {root_sha}", flush=True)
    # 4. commit
    msg = "白驹 AI 创作纪元 (ccowork AI Era) 站点源码 — 由 WorkBuddy REST 通道推送(历史折合为单提交)"
    d = api("POST", f"{API}/git/commits", {"message": msg, "tree": root_sha, "parents": []})
    commit_sha = d["sha"]
    print(f"[4/4] commit: {commit_sha}", flush=True)
    # 5. refs (init 已建 main, 用 update 兜底)
    try:
        d = api("PATCH", f"{API}/git/refs/heads/main", {"sha": commit_sha, "force": True})
        print("ref updated:", d.get("ref"))
    except RuntimeError as e:
        if "404" in str(e) or "422" in str(e):
            d = api("POST", f"{API}/git/refs", {"ref": "refs/heads/main", "sha": commit_sha})
            print("ref created:", d.get("ref"))
        else:
            raise
    print(f"DONE 仓库: https://github.com/{OWNER}/{REPO}", flush=True)

if __name__ == "__main__":
    main()
