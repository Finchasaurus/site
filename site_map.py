import os
import posixpath
import shutil
import sys
import tomllib
from pathlib import Path

MAP_FILE = "site-map.toml"
IGNORED_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini", ".git"}

class Rule:
    """One line of site map"""

    def __init__(self, source: Path, prefix: str):
        self.source = source
        self.prefix = prefix
        self.is_file = source.is_file()

    def matches(self, site_path: str) -> bool:
        return (
            self.prefix == "/" 
            or site_path == self.prefix
            or site_path.startswith(self.prefix + "/")
        )

    def lookup(self, site_path: str) -> Path:
        """the file/folder on disk for this path if the rule has one"""
        if self.is_file:
            return self.source if site_path == self.prefix else None

        rest = site_path[len(self.prefix):].lstrip("/")

        try:
            candidate = (self.source / rest).resolve()
        except (OSError, ValueError):
            return None

        # dont allow escaping the source folder
        if candidate != self.source and self.source not in candidate.parents:
            return None

        return candidate if candidate.exists() else None

    def files(self):
        """yield for everything the rule publishes"""
        if self.is_file:
            yield self.source, self.prefix
            return

        for p in self.source.rglob("*"):
            if p.is_file() and p.name not in IGNORED_NAMES:
                yield p, posixpath.join(self.prefix, p.relative_to(self.source).as_posix())

class SiteMap:
    def __init__(self, base: Path, rules: list[Rule], config_file: Path | None = None):
        self.base = base
        self.rules = rules
        self.config_file = config_file
        # most specific rule first so like /styles/ is gonna be tried before /
        self._by_specificity = sorted(rules, key=lambda r: len(r.prefix), reverse=True)

    @classmethod
    def load(cls, base: Path) -> "SiteMap":
        base = base.resolve()
        config = base / MAP_FILE

        if not config.is_file():
            return cls(base, [Rule(base, "/")])

        try:
            with config.open("rb") as f:
                data = tomllib.load(f).get("map", {})
        except tomllib.TOMLDecodeError as e:
            sys.exit(f"Error parsing {config}: {e}")

        if not data:
            sys.exit(f"Error: {config} has no [map] section")

        rules = [
            Rule((base / source).resolve(), posixpath.join("/", sys.prefix.lstrip("/")))
            for source, sys.prefix in data.items()
        ]

        return cls(base, rules, config)

    def resolve(self, site_path: str) -> Path | None:
        site_path = posixpath.normpath("/" + site_path.lstrip("/"))

        for rule in self._by_specificity:
            if rule.matches(site_path):
                found = rule.lookup(site_path)
                if found is not None:
                    return found
        return None

    def to_site(self, path: Path) -> str | None:
        path = path.resolve()
        best_match = None

        for rule in self.rules:
            if rule.is_file:
                if path == rule.source:
                    return rule.prefix
            elif path.is_relative_to(rule.source):
                site_path = posixpath.join(rule.prefix, path.relative_to(rule.source).as_posix())
            else:
                continue


            if best_match is None or len(rule.source.parts) > len(best_match[0].source.parts):
                best_match = (rule, site_path)

        return best_match[1] if best_match else None

    def files(self):
        for rule in self.rules:
            yield from rule.files()

    def missing(self) -> list[Path]:
        return [rule.source for rule in self.rules if not rule.source.exists()]

    def describe(self) -> str:
        return "\n".join(f"{rule.prefix:<16} <- {os.path.relpath(rule.source, self.base)}" for rule in self.rules)

    def build(self, out: Path) -> int:
        out = out.resolve()

        missing = self.missing()
        if missing:
            sys.exit(f"Error: the following source paths do not exist:\n" + "\n".join(str(p) for p in missing))

        if out == self.base or out in self.base.parents:
            sys.exit(f"Error: output folder {out} is inside the source folder {self.base}")

        written: dict[str, Path] = {}

        for source, site_path in self.files():
            if site_path in written:
                sys.exit(f"Error: multiple rules publish to the same site path {site_path}:\n"
                            f"  {written[site_path]}\n"
                            f"  {source}")

            written[site_path] = source

        if out.exists():
            if self.base not in out.parents:
                sys.exit(f"Error: output folder {out} already exists and is not inside the source folder {self.base}")
            shutil.rmtree(out)

        for site_path, source in written.items():
            dest = out / site_path.lstrip("/")
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, dest)

        return len(written)

def main(argv: list[str]) -> None:
    if len(argv) < 2 or argv[1] != "build":
        sys.exit("Usage: python site-map.py build <output-folder> <source-folder>")

    out = Path(argv[2]) if len(argv) > 2 else Path("deploy")
    project_dir = Path(argv[3]) if len(argv) > 3 else Path.cwd()

    site = SiteMap.load(project_dir)

    if site.config_file is None:
        sys.exit(f"Error: no {MAP_FILE} found in {project_dir}")

    count = site.build(out)

    print(f"Built {count} files into {out}.")
    print(site.describe())

if __name__ == "__main__":
    main(sys.argv)