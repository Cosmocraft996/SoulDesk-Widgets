"""发布本次迁仓中通过宿主试加载的固定 ZIP。"""
import argparse
import json
import os
import subprocess
from pathlib import Path

from widget import build, read_json, release_notes, require, sdk_bytes, sha256

ROOT = Path(__file__).resolve().parents[1]
BATCH = ROOT / "docs" / "migration-release-0.5.5.json"


def build_batch(output):
    batch = read_json(BATCH)
    sdk = sdk_bytes()
    output.mkdir(parents=True, exist_ok=True)
    results = []
    for slug, expected in sorted(batch["widgets"].items()):
        manifest, data = build(slug, sdk)
        require(manifest["id"] == expected["id"] and manifest["version"] == expected["version"]
                and len(data) == expected["sizeBytes"] and sha256(data) == expected["sha256"],
                f"{slug} 的构建产物与宿主试加载包不一致")
        name = f"{manifest['id']}-{manifest['version']}.zip"
        zip_path = output / name
        zip_path.write_bytes(data)
        zip_path.with_suffix(".sha256").write_text(f"{expected['sha256']}  {name}\n", encoding="utf-8")
        zip_path.with_suffix(".md").write_text(release_notes(slug, manifest["version"]) + "\n", encoding="utf-8")
        results.append((f"widget-{slug}-v{manifest['version']}", zip_path, expected["sha256"]))
    return results


def publish(tag, zip_path, digest, repository, commit):
    release = subprocess.run(["gh", "release", "view", tag, "--repo", repository, "--json", "isDraft"],
                             capture_output=True, text=True)
    if release.returncode:
        require("release not found" in release.stderr.lower(), release.stderr.strip())
        subprocess.run(["gh", "release", "create", tag, "--repo", repository, "--target", commit,
                        "--latest=false", "--title", tag, "--notes-file", str(zip_path.with_suffix(".md")),
                        str(zip_path), str(zip_path.with_suffix(".sha256"))], check=True)
        return

    check_dir = zip_path.parent / f"confirmed-{tag}"
    check_dir.mkdir(exist_ok=True)
    subprocess.run(["gh", "release", "download", tag, "--repo", repository, "--pattern", zip_path.name,
                    "--dir", str(check_dir), "--clobber"], check=True)
    require(sha256((check_dir / zip_path.name).read_bytes()) == digest, f"{tag} 的既有资产与验收包不一致")
    if json.loads(release.stdout)["isDraft"]:
        subprocess.run(["gh", "release", "edit", tag, "--repo", repository,
                        "--draft=false", "--latest=false"], check=True)


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--out", type=Path, required=True)
    cli.add_argument("--publish", action="store_true")
    args = cli.parse_args()
    rows = build_batch(args.out)
    print(f"构建与已验收摘要一致：{len(rows)} 项", flush=True)
    if args.publish:
        for tag, file, digest in rows:
            publish(tag, file, digest, os.environ["GITHUB_REPOSITORY"], os.environ["GITHUB_SHA"])


if __name__ == "__main__":
    main()
