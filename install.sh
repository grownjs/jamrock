#!/bin/bash

rm -rf $HOME/.jamrock
mkdir -p $HOME/.jamrock

echo "1. Downloading package..."

#curl https://jamrock.dev/jamrock-0.0.0.tgz | tar zx -C $HOME/.jamrock/
curl -s file://$PWD/build/jamrock-0.0.0.tgz | tar zx -C $HOME/.jamrock/

echo "2. Installing binary..."

CLI=/usr/local/bin/jamrock

cat << EOF > $CLI
#!/bin/bash
$HOME/.jamrock/package/bin/node \$*
EOF

chmod +x $CLI

echo "3. Done, now grab a beer!"
