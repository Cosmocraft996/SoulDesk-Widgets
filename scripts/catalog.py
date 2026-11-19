"""登记公开版本、验证收录历史并生成静态广场。"""

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path
from zipfile import BadZipFile

from widget import (
    ID, MAX_ZIP, ROOT, SLUG, WIDGETS, build, download, git, inspect_zip,
    json_bytes, read_json, release_notes, require, sdk_bytes, sha256, version_key,
)

CATALOG = ROOT / "catalog"
RELEASE_ROOT = "https://github.com/Cosmocraft996/SoulDesk-Widgets/releases/download"
RELEASE_HOSTS = {"github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"}
PACKAGE_FIELDS = ("version", "capabilities", "sizeBytes", "sha256")
VERSION_FIELDS = {*PACKAGE_FIELDS, "minHostVersion", "releaseNotes", "status", "downloadUrl"}
WIDGET_FIELDS = {"id", "name", "summary", "category", "screenshots", "versions"}


def filename(widget_id, version):
    return f"{widget_id}-{version}.zip"


def release_url(slug, widget_id, version):
    return f"{RELEASE_ROOT}/widget-{slug}-v{version}/{filename(widget_id, version)}"


def package_fields(data, widget_id):
    manifest = inspect_zip(data)
    require(manifest["id"] == widget_id, f"ZIP 的 ID 与收录条目不符：{widget_id}")
    return {"version": manifest["version"], "capabilities": manifest["capabilities"],
            "sizeBytes": len(data), "sha256": sha256(data)}


def verify_release(widget_id, item):
    data = download(item["downloadUrl"], item["sizeBytes"], RELEASE_HOSTS)
    require(package_fields(data, widget_id) == {key: item[key] for key in PACKAGE_FIELDS},
            f"{widget_id} {item['version']} 的线上 ZIP 与收录记录不符")


def load_catalog():
    revision = read_json(CATALOG / "revision.json")["revision"]
    require(type(revision) is int and 1 <= revision <= 2**53 - 1, "目录修订号无效")
    widgets = {}
    ids = set()
    for path in sorted(CATALOG.glob("*.json")):
        slug = path.stem
        if slug == "revision":
            continue
        require(re.fullmatch(SLUG, slug) and (WIDGETS / slug / "manifest.json").is_file(), f"目录项缺少组件源码：{slug}")
        widget = read_json(path)
        require(isinstance(widget, dict) and widget.keys() == WIDGET_FIELDS, f"组件资料字段无效：{slug}")
        manifest = read_json(WIDGETS / slug / "manifest.json")
        require(widget["id"] == manifest["id"] and re.fullmatch(ID, widget["id"])
                and widget["id"] not in ids, f"收录 ID 无效或重复：{slug}")
        ids.add(widget["id"])
        for key in ("name", "summary", "category"):
            require(isinstance(widget[key], str) and widget[key].strip(), f"{slug} 缺少 {key}")
        require(isinstance(widget["screenshots"], list), f"{slug} 的截图应为列表")
        for link in widget["screenshots"]:
            require(isinstance(link, str) and re.fullmatch(rf"\./images/{slug}(?:-[a-z0-9]+)?\.png", link),
                    f"{slug} 的截图路径无效")
            source = WIDGETS / slug / "preview" / Path(link).name
            require(source.is_file() and source.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"), f"缺少 PNG 截图：{source}")
        versions = set()
        require(isinstance(widget["versions"], list), f"{slug} 的版本应为列表")
        for item in widget["versions"]:
            require(isinstance(item, dict) and item.keys() == VERSION_FIELDS, f"{slug} 的版本字段无效")
            version_key(item["version"])
            version_key(item["minHostVersion"])
            require(item["version"] not in versions and version_key(item["version"]) <= version_key(manifest["version"]),
                    f"{slug} 的版本重复或高于当前源码版本")
            versions.add(item["version"])
            capabilities = item["capabilities"]
            require(isinstance(capabilities, list) and all(isinstance(key, str) and key for key in capabilities)
                    and len(set(capabilities)) == len(capabilities), f"{slug} 的目录权限无效或重复")
            require(type(item["sizeBytes"]) is int and 0 < item["sizeBytes"] <= MAX_ZIP
                    and re.fullmatch("[0-9a-f]{64}", item["sha256"]) and int(item["sha256"], 16) != 0,
                    f"{slug} 的 ZIP 信息无效")
            require(item["status"] in {"published", "withdrawn"} and isinstance(item["releaseNotes"], str)
                    and item["releaseNotes"].strip(), f"{slug} 缺少状态或更新说明")
            require(item["downloadUrl"] == release_url(slug, widget["id"], item["version"]),
                    f"{slug} 的下载地址必须指向对应版本的官方 Release 资产")
        widget["versions"].sort(key=lambda item: version_key(item["version"]), reverse=True)
        widgets[slug] = widget
    return revision, widgets


def check_history(base, revision, widgets):
    paths = git("ls-tree", "-r", "--name-only", base, "--", "catalog").decode().splitlines()
    if "catalog/revision.json" not in paths:
        return
    old_revision = json.loads(git("show", f"{base}:catalog/revision.json"))["revision"]
    old_widgets = {}
    for path in paths:
        if not path.endswith(".json") or path == "catalog/revision.json":
            continue
        old = json.loads(git("show", f"{base}:{path}"))
        slug = Path(path).stem
        if old["versions"]:
            require(slug in widgets and widgets[slug]["id"] == old["id"], f"{slug} 的已收录组件应保留历史")
            items = {item["version"]: item for item in widgets[slug]["versions"]}
            for item in old["versions"]:
                new = items.get(item["version"])
                require(new and all(new[field] == item[field] for field in (*PACKAGE_FIELDS, "downloadUrl")),
                        f"{slug} {item['version']} 的 ZIP 固定，撤回应修改状态")
        old["versions"].sort(key=lambda item: version_key(item["version"]), reverse=True)
        old_widgets[slug] = old
    old_active = {slug: widget for slug, widget in old_widgets.items() if widget["versions"]}
    active = {slug: widget for slug, widget in widgets.items() if widget["versions"]}
    changed_images = git("diff", "--name-only", base, "--", "widgets").decode().splitlines()
    screenshot_changed = any(path.startswith(f"widgets/{slug}/preview/") for slug in active for path in changed_images)
    require(revision >= old_revision and (active == old_active and not screenshot_changed or revision > old_revision),
            "发布目录或截图发生变化时需要提高目录修订号")


def generate(out, preview, verify, base):
    revision, widgets = load_catalog()
    if base:
        check_history(base, revision, widgets)
    if verify:
        for widget in widgets.values():
            for item in widget["versions"]:
                if item["status"] == "published":
                    verify_release(widget["id"], item)
    require(not out.exists() or not any(out.iterdir()), f"输出目录应为空：{out}")
    out.mkdir(parents=True, exist_ok=True)
    shutil.copytree(ROOT / "site", out, dirs_exist_ok=True)
    (out / ".nojekyll").touch()
    if preview:
        sdk = sdk_bytes()
        (out / "downloads").mkdir()
        for slug, widget in widgets.items():
            manifest, data = build(slug, sdk)
            basename = filename(widget["id"], manifest["version"])
            (out / "downloads" / basename).write_bytes(data)
            local = {**package_fields(data, widget["id"]), "minHostVersion": None, "status": "preview",
                     "releaseNotes": release_notes(slug, manifest["version"]), "downloadUrl": f"./downloads/{basename}"}
            widget["versions"] = [local, *widget["versions"]]
    available = [widget for widget in widgets.values() if widget["versions"]]
    if available:
        (out / "images").mkdir()
    for slug, widget in widgets.items():
        if widget["versions"]:
            for link in widget["screenshots"]:
                name = Path(link).name
                shutil.copyfile(WIDGETS / slug / "preview" / name, out / "images" / name)
    (out / "catalog.json").write_bytes(json_bytes({"schemaVersion": 1, "revision": revision, "widgets": available}))
    print(f"{out / 'catalog.json'}  修订号={revision}  组件={len(available)}")


def record(slug, zip_path, min_host):
    require(re.fullmatch(SLUG, slug), "无效组件目录名")
    revision, widgets = load_catalog()
    require(slug in widgets, f"缺少收录资料：{slug}")
    widget = widgets[slug]
    version_key(min_host)
    data = zip_path.read_bytes()
    item = package_fields(data, widget["id"])
    version = item["version"]
    require(zip_path.name == filename(widget["id"], version), "本地核验 ZIP 文件名与清单不符")
    require(not any(old["version"] == version for old in widget["versions"]), "该版本已有收录记录")
    item.update(minHostVersion=min_host, releaseNotes=release_notes(slug, version), status="published",
                downloadUrl=release_url(slug, widget["id"], version))
    verify_release(widget["id"], item)
    widget["versions"].insert(0, item)
    (CATALOG / f"{slug}.json").write_bytes(json_bytes(widget))
    (CATALOG / "revision.json").write_bytes(json_bytes({"revision": revision + 1}))
    print(f"已收录 {widget['id']} {version}，目录修订号 {revision + 1}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    make = commands.add_parser("build")
    make.add_argument("--out", type=Path, required=True)
    make.add_argument("--preview", action="store_true")
    make.add_argument("--verify-downloads", action="store_true")
    make.add_argument("--base")
    add = commands.add_parser("record")
    add.add_argument("slug")
    add.add_argument("verified_zip", type=Path)
    add.add_argument("--min-host", required=True, help="填写 Windows 实测通过的最低宿主版本")
    args = parser.parse_args()
    if args.command == "record":
        record(args.slug, args.verified_zip, args.min_host)
    else:
        generate(args.out, args.preview, args.verify_downloads, args.base)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, BadZipFile, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from error
