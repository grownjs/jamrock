#!/bin/bash

rm -rf $HOME/.jamrock
mkdir -p $HOME/.jamrock

echo "■ Downloading package..."

curl -s https://jamrock.dev/jamrock-0.0.0.tgz | tar zx -C $HOME/.jamrock/

if [[ ! -d $HOME/.jamrock/package ]]; then
  echo "The package could not be downloaded!"
  exit 1
fi

echo "■ Installing binary..."

CLI=$HOME/.local/bin/jamrock
RUNTIME=node

ask_runtime() {
  OPTIONS=(node deno bun)
  PS3="Please choose a runtime: "

  select choice in "${OPTIONS[@]}"; do
    case $choice in
      node)
        break
        ;;
      deno)
        break
        ;;
      bun)
        break
        ;;
      *)
        echo "Invalid option. Please try again."
        ;;
    esac
  done

  RUNTIME=$choice
}

ask_runtime

cat << EOF > $CLI
#!/bin/bash
$HOME/.jamrock/package/bin/$RUNTIME \$*
EOF

chmod +x $CLI

echo "■ Done, now grab a beer!"
