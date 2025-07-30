---
title: chroot挂载OTG硬盘，自动硬链接保种
date: 2025-7-30
tags: [Android, Linux, chroot, OTG, qBittorrent, 瞎折腾™]
head:
  - - meta
    - name: description
      content: 简单介绍chroot环境挂载OTG硬盘和自动硬链接保种的流程。

  - - meta
    - name: keywords
      content: Android Linux chroot OTG qBittorrent
---

---

# 〇、挂载 OTG 硬盘

Android 系统将外接硬盘挂载在了`/mnt/media_rw/`目录下，目录所有者为 root,用户组为`external_storage`，GID 为`1077`，我们只要将 chroot 中的用户加入`external_storage`用户组，并在启动 chroot 时挂载`/mnt/media_rw/`目录即可。

挂载命令，`$Mount_Path`为你的实际 chroot 目录：

```bash
mount -bind /mnt/media_rw/ $Mount_Path/media
```

在 chroot 环境中，新建`external_storage`用户组：

```bash
groupadd -g 1077 external_storage
```

将用户加入`external_storage`用户组：

```bash
usermod -aG external_storage user
```

验证是否加入成功：

```bash
groups user
```

正确操作后即可在 chroot 目录的`/media`目录下看见硬盘目录。

# 一、自动硬链接保种

基于[hr3lxphr6j](https://space.bilibili.com/454758)的脚本，原文地址[在这里](https://www.bilibili.com/opus/812059602795364356)。由于阿 B 的代码块犯病了，多了很多转译字符，这里将其去除。

::: tip
可能需要安装**jq**包才能正常运行
:::

```shell
#!/usr/bin/env bash

set -eu

# QB的路径，一般都是在放在QB同一台机器或者容器上，所以这个不用改
QBTORRENT_URL="http://127.0.0.1:8080/"

# QB的分类以及要将硬链接的创建目的地，json格式，需要根据实际情况修改
CATEGORY_MAP='
{
  "Episodes": "/media/9CEA0041EA0019E2/Jellyfin/Episodes",
  "BangumiMovie": "/media/9CEA0041EA0019E2/Jellyfin/BangumiMovie",
  "Movie": "/media/9CEA0041EA0019E2/Jellyfin/Movie"
}
'

get_dest_dir_by_category_name() {
  _category_name="$1"
  echo "$CATEGORY_MAP" | jq -r --arg category "$_category_name" '.[$category]'
}

get_torrent_info_by_hash() {
  _hash="$1"
  curl -sfS "${QBTORRENT_URL%/}/api/v2/torrents/info?hashes=$_hash" | jq -r '.[0]'
}

log() {
  _level="$1"
  _msg="$2"
  echo "$(date '+%y-%m-%d %H:%M') [$_level]: $_msg" >> "$(dirname "$0")/hooks.log"
}

main() {
  for _hash in "$@"; do
    # 找不到hash对应的种子信息则跳过
    if ! _info=$(get_torrent_info_by_hash "$_hash"); then
      log "ERROR" "torrent [hash=$_hash] not found"
      continue
    fi

    _name=$(echo "$_info" | jq -r '.name')
    _content_path=$(echo "$_info" | jq -r '.content_path')

    # category为空的种子跳过
    if ! _category_name=$(echo "$_info" | jq -r '.category'); then
      log "INFO" "torrent [name=$_name] category is empty, skipped"
      continue
    fi

    # category不在映射表里则跳过
    if ! _dest_dir=$(get_dest_dir_by_category_name "$_category_name"); then
      log "INFO" "torrent [name=$_name, category=$_category_name] dest path not specified, skipped"
      continue
    fi

    # 递归创建硬链接
    mkdir -p "$_dest_dir"
    cp -rl "$_content_path" "$_dest_dir/"
    log "INFO" "torrent [name=$_name, category=$_category_name] successfully hard linked to: $_dest_dir"
  done
}

main "$@"
```

具体使用方法可以参考原文。
