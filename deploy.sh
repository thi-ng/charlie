#!/bin/sh

readonly BUCKET="s3://forth.thi.ng"
readonly OPTS="--profile toxi-full --acl public-read"

gzip -r -k -9 dist

for f in $(find dist -name "*.gz"); do
    src="${f/dist\//}"
    dest="$BUCKET/${src%.gz}"
    name=$(basename -- "${f%.gz}")
    ext="${name##*.}"
    case $ext in
        js) mime="application/javascript;charset=utf-8" ;;
        json) mime="application/json;charset=utf-8" ;;
        html) mime="text/html;charset=utf-8" ;;
        svg) mime="text/svg+xml;charset=utf-8" ;;
        css) mime="text/css;charset=utf-8" ;;
        png) mime="image/png" ;;
        jpg) mime="image/jpeg" ;;
        fs) mime="text/plain;charset=utf-8" ;;
        *) mime="application/octet-stream";;
    esac
    echo "$src -> $dest ($mime)"
    aws s3 cp $f $dest $OPTS --content-type $mime --content-encoding gzip
done
