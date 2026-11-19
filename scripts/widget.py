"""构建和检查 SoulDesk 普通组件包。"""

import argparse
import hashlib
import io
import json
import re
import stat
import subprocess
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen
from zipfile import BadZipFile, ZIP_DEFLATED, ZIP_STORED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
WIDGETS = ROOT / "widgets"
MAX_ZIP = 20 * 1024 * 1024
MAX_EXPANDED = 50 * 1024 * 1024
VERSION = r"(?:0|[1-9][0-9]{0,9})(?:\.(?:0|[1-9][0-9]{0,9})){2}"
SLUG = r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
ID = r"(?=.{3,80}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+"
EXTENSIONS = set(".html .css .js .mjs .json .png .jpg .jpeg .gif .webp .svg .ico .woff .woff2 .ttf .txt .map .mp3 .m4a .wav".split())
RESERVED = {"con", "prn", "aux", "nul", *(f"{prefix}{index}" for prefix in ("com", "lpt") for index in range(1, 10))}
LOCK_PATH = ROOT / "sdk.lock.json"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def version_key(value):
    require(isinstance(value, str) and re.fullmatch(VERSION, value), f"无效版本：{value}")
    parts = tuple(map(int, value.split(".")))
    require(max(parts) <= 4294967295, f"版本超出宿主范围：{value}")
    return parts


def download(url, limit, hosts=None):
    request_url = urlsplit(url)
    require(request_url.scheme == "https" and request_url.hostname, f"需要 HTTPS 地址：{url}")
    with urlopen(url, timeout=30) as response:
        final = urlsplit(response.geturl())
        require(final.scheme == "https" and (hosts is None or final.hostname in hosts), "下载重定向超出允许范围")
        data = response.read(limit + 1)
    require(0 < len(data) <= limit, f"下载大小不符合要求：{url}")
    return data


def sdk_bytes(local=None):
    lock = read_json(LOCK_PATH)
    require(lock["repository"] == "Cosmocraft996/SoulDesk" and lock["path"] == "sdk/host.js"
            and lock["hostApiMajor"] == 1 and re.fullmatch("[0-9a-f]{40}", lock["commit"])
            and re.fullmatch("[0-9a-f]{64}", lock["sha256"]), "SDK 锁定文件无效")
    cache = ROOT / ".cache" / f'host-{lock["commit"]}.js'
    if local:
        data = local.read_bytes()
    elif cache.is_file() and sha256(cache.read_bytes()) == lock["sha256"]:
        return cache.read_bytes()
    else:
        url = f'https://raw.githubusercontent.com/{lock["repository"]}/{lock["commit"]}/{lock["path"]}'
        data = download(url, 128 * 1024, {"raw.githubusercontent.com"})
    require(sha256(data) == lock["sha256"], "SDK SHA-256 与锁定文件不符")
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_bytes(data)
    return data


def validate_manifest(manifest, slug=None):
    require(isinstance(manifest, dict), "清单必须是对象")
    widget_id = manifest.get("id")
    require(isinstance(widget_id, str) and re.fullmatch(ID, widget_id), "无效组件 ID")
    if slug and widget_id.startswith("official.souldesk."):
        require(widget_id == f"official.souldesk.{slug}", "组件 ID 与目录名不符")
    name = manifest.get("name")
    require(isinstance(name, str) and name.strip() and len(name.encode("utf-8")) <= 128, "组件名称无效")
    version_key(manifest.get("version"))
    for field in ("schemaVersion", "hostApiMajor", "loadCheck"):
        require(type(manifest.get(field)) is int and manifest[field] == 1, f"无效清单字段：{field}")
    entry = manifest.get("entry")
    require(isinstance(entry, str) and entry.startswith("dist/") and entry.endswith(".html"), "无效入口")
    capabilities = manifest.get("capabilities")
    require(isinstance(capabilities, list)
            and all(isinstance(item, str) and re.fullmatch(r"[a-z][a-zA-Z0-9_-]*(?:\.[a-z][a-zA-Z0-9_-]*)+", item)
                    for item in capabilities)
            and len(set(capabilities)) == len(capabilities), "清单权限无效或重复")
    for field in ("defaultSize", "minSize"):
        size = manifest.get(field)
        require(isinstance(size, dict)
                and type(size.get("width")) is int and 120 <= size["width"] <= 1600
                and type(size.get("height")) is int and 80 <= size["height"] <= 1200,
                f"无效组件尺寸：{field}")
    require(all(manifest["minSize"][key] <= manifest["defaultSize"][key] for key in ("width", "height")),
            "默认尺寸小于最小尺寸")
    require(isinstance(manifest.get("settingsSchema"), dict), "缺少设置结构")


def check_path(name):
    parts = name.split("/")
    for part in parts:
        require(re.fullmatch(r"[a-zA-Z0-9_][a-zA-Z0-9._-]*", part)
                and not part.endswith(".") and part.split(".")[0].lower() not in RESERVED, f"无效包路径：{name}")
    require(all(part.lower() != "__souldesk_runtime.js" for part in parts), f"宿主保留路径：{name}")


def resolve_asset(source, ref, files):
    url = urlsplit(ref)
    if unquote(ref).startswith("#") or re.match(r"data:(?:(?:image|font)/|application/x-font-ttf[;,])", ref, re.I):
        return
    require(not url.scheme and not url.netloc and not url.path.startswith("/") and "\\" not in ref,
            f"{source} 的资源必须使用相对路径：{ref}")
    target = list(PurePosixPath(source).parent.parts)
    for part in unquote(url.path).split("/"):
        if part == "..":
            require(len(target) > 1, f"资源超出 dist：{ref}")
            target.pop()
        elif part and part != ".":
            target.append(part)
    require("/".join(target) in files, f"{source} 引用的资源不存在：{ref}")


class PageAssets(HTMLParser):
    def __init__(self, source, files):
        super().__init__()
        self.source = source
        self.files = files

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        require(tag != "base" and not any(key.startswith("on") for key in attrs),
                f"{self.source} 含 base 元素或内联事件")
        require(tag != "script" or attrs.get("src"), f"{self.source} 含内联脚本")
        require("srcset" not in attrs, f"{self.source} 请为图片使用单独的相对 src")
        for key in ("src", "href", "poster"):
            if attrs.get(key):
                resolve_asset(self.source, attrs[key], self.files)


def inspect_zip(data):
    require(0 < len(data) <= MAX_ZIP, "ZIP 大小超限")
    with ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        require(0 < len(entries) <= 256, "ZIP 项目数量超限")
        require(sum(entry.file_size for entry in entries) <= MAX_EXPANDED, "ZIP 展开大小超限")
        paths = set()
        files = {}
        directories = set()
        for entry in entries:
            name = entry.orig_filename.rstrip("/") if entry.is_dir() else entry.orig_filename
            check_path(name)
            lower = name.lower()
            mode = stat.S_IFMT(entry.external_attr >> 16)
            require(mode in (0, stat.S_IFDIR if entry.is_dir() else stat.S_IFREG), f"ZIP 含非普通文件：{name}")
            require(lower not in paths and not entry.flag_bits & 1, f"ZIP 含重复或加密项：{name}")
            require(entry.compress_type in (ZIP_STORED, ZIP_DEFLATED), f"ZIP 压缩方式不支持：{name}")
            parents = {parent.as_posix().lower() for parent in PurePosixPath(name).parents}
            require(not parents.intersection(files), f"ZIP 文件与目录重名：{name}")
            paths.add(lower)
            directories.update(parents)
            if entry.is_dir():
                require(name == "dist" or name.startswith("dist/"), f"目录超出 dist：{name}")
                directories.add(lower)
                continue
            require(lower not in directories, f"ZIP 文件与目录重名：{name}")
            require(name == "manifest.json" or name.startswith("dist/") and Path(name).suffix in EXTENSIONS,
                    f"不支持的包内文件：{name}")
            files[lower] = (name, archive.read(entry))
    files = dict(files.values())
    require("manifest.json" in files, "ZIP 缺少根目录清单")
    manifest = json.loads(files["manifest.json"])
    validate_manifest(manifest)
    require(manifest["entry"] in files and "dist/host.js" in files, "ZIP 缺少入口或 SDK")
    for name, content in files.items():
        if name.endswith(".html"):
            PageAssets(name, files).feed(content.decode("utf-8"))
        if name.endswith(".css"):
            css = re.sub(r"/\*.*?\*/", "", content.decode("utf-8"), flags=re.S)
            for ref in re.findall(r"""url\(\s*['"]?([^)'"]+)['"]?\s*\)|@import\s+['"]([^'"]+)""", css):
                resolve_asset(name, (ref[0] or ref[1]).strip(), files)
        if name.endswith((".js", ".mjs")) and name != "dist/host.js":
            # 引入检查覆盖源文件顶层导入，跳过打包器内嵌的文本与代码示例。
            imports = re.findall(r"""^\s*import\s+(?:(?:[^
;]+?)\s+from\s+)?['"]([^'"]+)['"]""",
                                 content.decode("utf-8"), re.M)
            for ref in imports:
                require(ref.startswith(("./", "../")), f"{name} 的脚本导入必须是相对路径：{ref}")
                resolve_asset(name, ref, files)
    return manifest


def build(slug, sdk):
    require(re.fullmatch(SLUG, slug), f"无效组件目录名：{slug}")
    source = WIDGETS / slug
    manifest = read_json(source / "manifest.json")
    validate_manifest(manifest, slug)
    for doc in ("README.md", "CHANGELOG.md"):
        require((source / doc).is_file(), f"{slug} 缺少 {doc}")
    require(re.search(rf"^## {re.escape(manifest['version'])}\s*$", (source / "CHANGELOG.md").read_text(encoding="utf-8"), re.M),
            f"{slug} 的更新记录缺少 {manifest['version']}")
    files = {"manifest.json": json_bytes(manifest), "dist/host.js": sdk}
    for path in sorted((source / "src").rglob("*")):
        require(not path.is_symlink(), f"源码包含符号链接：{path}")
        if path.is_file():
            name = "dist/" + path.relative_to(source / "src").as_posix()
            require(name not in files, f"源码占用保留路径：{name}")
            data = path.read_bytes()
            if path.suffix in {".html", ".css", ".js", ".mjs", ".json", ".svg", ".txt", ".map"}:
                data = data.replace(b"\r\n", b"\n")
            files[name] = data
    target = io.BytesIO()
    # 固定元数据和顺序，轻量组件跨操作系统产生逐字节相同的 ZIP。
    compression = ZIP_DEFLATED if sum(map(len, files.values())) >= MAX_ZIP else ZIP_STORED
    with ZipFile(target, "w", compression=compression, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            entry = ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.compress_type = compression
            archive.writestr(entry, data)
    data = target.getvalue()
    inspect_zip(data)
    return manifest, data


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def check_build_changes(base, slug, manifest, sdk):
    old_manifest = f"widgets/{slug}/manifest.json"
    if not git("ls-tree", base, "--", old_manifest).strip():
        return
    old = json.loads(git("show", f"{base}:{old_manifest}"))
    old_lock = json.loads(git("show", f"{base}:sdk.lock.json"))
    paths = git("diff", "--name-only", base, "--", old_manifest, f"widgets/{slug}/src/").strip()
    require(manifest["id"] == old["id"], f"{slug} 的组件 ID 不得改动")
    require(not (paths or old_lock["sha256"] != sha256(sdk))
            or version_key(manifest["version"]) > version_key(old["version"]), f"{slug} 的包内容变更需要升版")


def release_notes(slug, version):
    notes = (WIDGETS / slug / "CHANGELOG.md").read_text(encoding="utf-8")
    match = re.search(rf"^## {re.escape(version)}[ \t]*\n(.*?)(?=^## |\Z)", notes, re.M | re.S)
    require(match and match[1].strip(), f"{slug} 缺少 {version} 更新说明")
    return match[1].strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("widget", nargs="*")
    parser.add_argument("--tag")
    parser.add_argument("--sdk", type=Path)
    parser.add_argument("--base")
    parser.add_argument("--out", type=Path, default=ROOT / "artifacts" / "widgets")
    args = parser.parse_args()
    slugs = args.widget or sorted(path.name for path in WIDGETS.iterdir() if path.is_dir())
    if args.tag:
        match = re.fullmatch(rf"widget-({SLUG})-v({VERSION})", args.tag)
        require(match and not args.widget, "标签应为 widget-组件目录-v数字版本")
        slugs = [match[1]]
    sdk = sdk_bytes(args.sdk)
    for slug in slugs:
        manifest, data = build(slug, sdk)
        version = manifest["version"]
        if args.tag:
            require(version == match[2], "标签与清单版本不符")
        if args.base:
            check_build_changes(args.base, slug, manifest, sdk)
        filename = f'{manifest["id"]}-{version}.zip'
        target = args.out / filename
        digest = sha256(data)
        notes = release_notes(slug, version)
        args.out.mkdir(parents=True, exist_ok=True)
        require(not target.exists() or target.read_bytes() == data, f"成品已存在且内容不同：{target}")
        target.write_bytes(data)
        target.with_suffix(".sha256").write_text(f"{digest}  {filename}\n", encoding="utf-8", newline="\n")
        target.with_suffix(".md").write_text(
            f"{notes}\n\n- 文件大小 {len(data)} 字节\n- SHA-256 {digest}\n", encoding="utf-8", newline="\n")
        print(f"{target}  {len(data)} 字节  SHA-256={digest}")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, BadZipFile, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from error
