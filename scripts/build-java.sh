#!/usr/bin/env bash
# Compile the Java projects in wasm/ to JavaScript with TeaVM for the in-browser demos.
# Needs a JDK (11+) and curl; the TeaVM jars are downloaded once into .cache/teavm/.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
demos="$root/public/demos"
teavm_version=0.14.1
cache="$root/.cache/teavm"
maven=https://repo1.maven.org/maven2

fetch() { # fetch <group path> <artifact> <version> [classifier]
  local file="$2-$3${4:+-$4}.jar"
  if [[ ! -f "$cache/$file" ]]; then
    mkdir -p "$cache"
    curl -sSfL -o "$cache/$file" "$maven/$1/$2/$3/$file"
  fi
  echo "$cache/$file"
}
cli=$(fetch org/teavm teavm-cli "$teavm_version" all)
interop=$(fetch org/teavm teavm-interop "$teavm_version")
jso=$(fetch org/teavm teavm-jso "$teavm_version")
# Work around two packaging bugs in teavm-cli-all: it references the un-relocated
# commons-cli, and its merged plugin list keeps only JCLPlugin (so the build fails
# with "Service not registered: ...MetadataRegistration"). Supply both ourselves.
commons_cli=$(fetch commons-cli commons-cli 1.9.0)
plugins="$cache/plugins"
mkdir -p "$plugins/META-INF/services"
printf '%s
' org.teavm.classlib.impl.JCLPlugin org.teavm.jso.impl.JSOPlugin   org.teavm.platform.plugin.PlatformPlugin org.teavm.metaprogramming.impl.MetaprogrammingPlugin   > "$plugins/META-INF/services/org.teavm.vm.spi.TeaVMPlugin"

# Java uses ';' as the classpath separator on Windows (Git Bash) and ':' elsewhere.
sep=':'; [[ "${OS:-}" == Windows_NT ]] && sep=';'
cp() { local IFS="$sep"; echo "$*"; }
winpath() { command -v cygpath >/dev/null && cygpath -m "$1" || echo "$1"; }

# binarytree
classes="$(mktemp -d)"
trap 'rm -rf "$classes"' EXIT
src="$root/wasm/binarytree"
javac --release 11 -nowarn -cp "$(cp "$(winpath "$interop")" "$(winpath "$jso")")" \
  -d "$(winpath "$classes")" "$src"/*.java
mkdir -p "$demos/binarytree"
java -cp "$(cp "$(winpath "$plugins")" "$(winpath "$cli")" "$(winpath "$commons_cli")")" org.teavm.cli.TeaVMRunner \
  -t js -m -O 2 -p "$(winpath "$classes")" -p "$(winpath "$cli")" \
  -d "$(winpath "$demos/binarytree")" -f binarytree.js \
  binarytree.com.java.Main
echo "Built $demos/binarytree/binarytree.js"
