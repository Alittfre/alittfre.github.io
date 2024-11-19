---
title: 使用闲置安卓手机搭建自动追番的流媒体平台
date: 2024-11-17
tags: [Android, Linux, chroot, AutoBangumi, qBittorrent, Jellyfin, 瞎折腾™]
head:
  - - meta
    - name: description
      content: 使用闲置安卓手机搭建自动追番的流媒体平台。记录一下之前折腾旧手机部署 Ubuntu chroot 环境当服务器用，并部署 AutoBangumi + qBittorrent + Jellyfin 进行实际应用的流程。

  - - meta
    - name: keywords
      content: Android Linux chroot AutoBangumi qBittorrent jellyfin
---

Android 基于 Liunx 🤔
Android 手机 = 服务器 ☝️🤓

---

# 前言

这次记录一下之前折腾旧手机部署 Ubuntu chroot 环境当服务器用，并部署 AutoBangumi + qBittorrent + Jellyfin 进行实际应用的流程。

chroot 环境的安装参考自：[\[Root\] 手機 Termux 建立 chroot Ubuntu 環境，免 Linux Deploy](https://ivonblog.com/posts/termux-chroot-ubuntu/)

# 〇、手机软硬件需求

- 一台解锁 BL，可以获取 ROOT 权限的安卓手机
- 手机 SOC 建议晓龙 660 以上
- 内存 >= 4GB
- 储存空间 >= 64GB

本次测试手机：Redmi Note 7 ,4+64 版本,搭载基于安卓 13 的 Arrow OS

<img src="/post_pic/android-autobangumi-lavender-info.png" alt="Redmi Note 7" data-fancybox="gallery" height="600" />

---

# 一、前置环境准备

1. 使用 [Magisk](https://github.com/topjohnwu/Magisk/releases/tag/v28.0) 安装 [Busybox 模块](https://github.com/Magisk-Modules-Alt-Repo/BuiltIn-BusyBox/releases)
2. 安装 [Termux](https://github.com/termux/termux-app/releases/tag/v0.118.1)
3. 科学的上网环境

---

# 二、安装 Ubuntu chroot 环境

1. 打开 Termux，升级已安装的软件包并安装 tsu

```bash
pkg update
pkg install tsu
```

2. 切换到 su，进入安卓 shell

```bash
su
```

::: tip
Magisk 会弹出授权窗口，授予 Root 权限即可
:::

3. 创建存放系统的目录

```bash
mkdir /data/local/tmp/chrootubuntu
cd /data/local/tmp/chrootubuntu
```

4. 下载 Ubuntu 系统

```bash
wget https://cdimage.ubuntu.com/ubuntu-base/releases/22.04/release/ubuntu-base-22.04-base-arm64.tar.gz
```

5. 解压缩，并设置 sdcard 目录

```bash
tar xpvf ubuntu-base-22.04-base-arm64.tar.gz --numeric-owner
mkdir sdcard
cd ../
```

6. 新建启动 chroot 的 shell 脚本，`vi startu.sh`

```shell
#!/bin/sh

# Ubuntu系统路径
UBUNTUPATH="/data/local/tmp/chrootubuntu"

# 解决setuid问题
busybox mount -o remount,dev,suid /data

busybox mount --bind /dev $UBUNTUPATH/dev
busybox mount --bind /sys $UBUNTUPATH/sys
busybox mount --bind /proc $UBUNTUPATH/proc
busybox mount -t devpts devpts $UBUNTUPATH/dev/pts

# Electron APPS需要/dev/shm
if [ ! -d /dev/shm ]; then
  echo "Creating /dev/shm directory..."
  mkdir /dev/shm
fi

busybox mount --bind /dev/shm $UBUNTUPATH/dev/shm

# 挂载手机sdcard
busybox mount --bind /sdcard $UBUNTUPATH/sdcard

# 以root用户启动chroot
busybox chroot $UBUNTUPATH /bin/su - root

# 以user用户启动chroot
#busybox chroot $UBUNTUPATH /bin/su - user

# 退出shell后取消挂载
busybox umount $UBUNTUPATH/dev/shm
busybox umount $UBUNTUPATH/dev/pts
busybox umount $UBUNTUPATH/dev
busybox umount $UBUNTUPATH/proc
busybox umount $UBUNTUPATH/sys
busybox umount $UBUNTUPATH/sdcard
```

7. 授予脚本执行权限，进入 chroot

```bash
chmod +x startu.sh
sh startu.sh
```

8. 设置 DNS 和 host

```bash
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "127.0.0.1 localhost" > /etc/hosts
```

9. 然后解決`Download is performed unsandboxed as root`警告，并让 Root 能使用 Android 的网络

```bash
groupadd -g 3003 aid_inet
groupadd -g 3004 aid_net_raw
groupadd -g 1003 aid_graphics
usermod -g 3003 -G 3003,3004 -a _apt
usermod -G 3003 -a root
```

::: details

### 背景知识

#### 1. Android 网络权限组：

Android 使用 Linux 内核，并定义了一些特定的组来管理权限。
aid_inet (3003)：允许访问网络功能。
aid_net_raw (3004)：允许直接访问网络原始套接字（例如 ping 等）。
aid_graphics (1003)：允许访问图形硬件资源。

#### 2. APT 的警告：

当 apt 在 root 权限下运行时，它会有一些安全检查。如果运行的环境没有设置好用户权限，可能会发出“unsandboxed”警告。
为了解决这个问题，可以为 \_apt 用户分配适当的权限。
:::

10. 更新 apt 存储库，更新软件包，安装常用工具

```bash
apt update
apt upgrade -y
apt install vim net-tools sudo git curl wget zip
```

11. 修改 root 用户密码，并新增普通用户 user

```bash
# 修改root用户密码
passwd root
#新增普通用户user并设置密码
groupadd storage
groupadd wheel
useradd -m -g users -G wheel,audio,video,storage,aid_inet -s /bin/bash user
passwd user
```

12. 为 user 添加 su 权限，使用 vim 编辑`/etc/sudoers`

```bash
vim /etc/sudoers
```

在 `root ALL=(ALL) ALL` 的下一行加入以下內容

```
user    ALL=(ALL:ALL) ALL
```

13. 切换到 user 用户

```bash
su user
```

14. 安装中文语言包并设置中文环境

```bash
sudo apt install locales language-pack-zh-hans* -y
sudo dpkg-reconfigure locales
```

::: tip
执行 `sudo dpkg-reconfigure locales` 后会显示语言列表，**直接按下回车**后会接着显示第二页，之后输入`zh_CN.UTF-8 UTF-8`前面的序号 492。随着软件更新，序号可能发生变化，请以实际为准。之后再输入 3 即可。
:::

15. 设置北京时间

```bash
sudo apt install tzdata -y
```

之后输入 `Asia` 前的序号，然后在下一个列表中输入 `Shanghai` 前的序号即可

16. 停用 snap
    chroot 环境下 snap 跑不起来，只能将其停用

```bash
sudo apt-get autopurge snapd
cat <<EOF | sudo tee /etc/apt/preferences.d/nosnap.pref
# To prevent repository packages from triggering the installation of Snap,
# this file forbids snapd from being installed by APT.
# For more information: https://linuxmint-user-guide.readthedocs.io/en/latest/snap.html
Package: snapd
Pin: release a=*
Pin-Priority: -10
EOF
```

17. 修改启动 chroot 的启动脚本，使用 user 用户登录

```bash
# 退出chroot环境
exit
```

然后强制停止 Termux，再重新启动，并编辑启动脚本：

```bash
#编辑启动脚本
su -c "vi /data/local/tmp/startu.sh"
```

```shell
#!/bin/sh

# Ubuntu系统路径
UBUNTUPATH="/data/local/tmp/chrootubuntu"

# 解决setuid问题
busybox mount -o remount,dev,suid /data

busybox mount --bind /dev $UBUNTUPATH/dev
busybox mount --bind /sys $UBUNTUPATH/sys
busybox mount --bind /proc $UBUNTUPATH/proc
busybox mount -t devpts devpts $UBUNTUPATH/dev/pts

# Electron APPS需要/dev/shm
if [ ! -d /dev/shm ]; then
  echo "Creating /dev/shm directory..."
  mkdir /dev/shm
fi

busybox mount --bind /dev/shm $UBUNTUPATH/dev/shm

# 挂载手机sdcard
busybox mount --bind /sdcard $UBUNTUPATH/sdcard

# 以root用户启动chroot
# busybox chroot $UBUNTUPATH /bin/su - root

# 以user用户启动chroot
busybox chroot $UBUNTUPATH /bin/su - user

# 退出shell后取消挂载
busybox umount $UBUNTUPATH/dev/shm
busybox umount $UBUNTUPATH/dev/pts
busybox umount $UBUNTUPATH/dev
busybox umount $UBUNTUPATH/proc
busybox umount $UBUNTUPATH/sys
busybox umount $UBUNTUPATH/sdcard
```

18. 进入 chroot 环境

```bash
su
sh /data/local/tmp/startu.sh
```

至此，Ubuntu chroot 环境部署完成

---

# 三、部署自动追番三件套：qBittorrent + Jellyfin + AutoBangumi

1. 安装 qBittorrent

由于官方源并没有提供 qBittorrent，这里需要先安装`software-properties-common`并添加第三方源，之后再安装 qBittorrent

```bash
sudo apt install software-properties-common -y
sudo add-apt-repository ppa:qbittorrent-team/qbittorrent-stable
sudo apt update
sudo apt install qbittorrent-nox
```

2. 安装 Jellyfin

同样由于官方源没有提供 Jellyfin，需要添加第三方源

添加 Jellyfin 项目的 GPG 密钥

```bash
wget -O - https://repo.jellyfin.org/jellyfin_team.gpg.key | sudo apt-key add -
```

添加 Jellyfin 仓库到系统源

```bash
echo "deb [arch=$( dpkg --print-architecture )] https://repo.jellyfin.org/$( awk -F'=' '/^ID=/{ print $NF }' /etc/os-release ) $( awk -F'=' '/^VERSION_CODENAME=/{ print $NF }' /etc/os-release ) main" | sudo tee /etc/apt/sources.list.d/jellyfin.list
```

更新源并安装 Jellyfin

```bash
sudo apt update
sudo apt install jellyfin
```

3. 安装 AutoBangumi

虽然官方推荐使用 Docker 部署，但是我们的 chroot 环境并不支持 Docker，安卓系统的内核也需要做一些修改才能支持 Docker。

参考官方的[本地部署教程](https://www.autobangumi.org/deploy/local.html)，直接将项目部署在 user 根目录就行，即`cd ~`

4. 编写三件套一键启动脚本 `vim run_AB.sh`

```shell
#!/bin/bash

# 启动 qbittorrent-nox
echo "Starting qbittorrent-nox..."
qbittorrent-nox &

# 启动 jellyfin 并使用 HTTP 代理
echo "Starting Jellyfin with HTTP proxy..."
env http_proxy="http://127.0.0.1:2080" https_proxy="http://127.0.0.1:2080" jellyfin &

# 启动 AutoBangumi
echo "Starting AutoBangumi..."
cd /home/user/AutoBangumi/src
./env/bin/python3 main.py &

# 等待所有进程启动
wait

echo "All services have been started."

```

授予脚本执行权限并运行

```bash
chmod +x run_AB.sh
sh run_AB.sh
```

至此，自动追番三件套部署完成

# 四、配置自动追番三件套

1. 固定手机局域网 IP

这一步因路由器固件而异，进入路由器后台，固定手机局域网 IP，通常在内网 DHCP 服务器设置

<img src="/post_pic/android-autobangumi-fix-ip.png" alt="fix-ip" data-fancybox="gallery" width="600" />

2. 配置 qBittorrent

浏览器打开固定的局域网 IP:8080，比如我的是http://192.168.123.66:8080/

默认用户名：admin，默认密码：adminadmin

<img src="/post_pic/android-autobangumi-qbit-login.png" alt="qbit-login" data-fancybox="gallery" width="600" />

登录后进入主界面，点击顶栏的蓝色齿轮开始配置

<img src="/post_pic/android-autobangumi-qbit-main.png" alt="qbit-main" data-fancybox="gallery" width="600" />

### 默认保存路径配置为`/home/user/downloads/Bangumi`

<img src="/post_pic/android-autobangumi-qbit-setting1.png" alt=qbit-setting1 data-fancybox="gallery" width="600" />

### 连接设置如图

<img src="/post_pic/android-autobangumi-qbit-setting2.png" alt="qbit-setting2" data-fancybox="gallery" width="600" />

### BitTorrent 设置如图

<img src="/post_pic/android-autobangumi-qbit-setting3.png" alt="qbit-setting3" data-fancybox="gallery" width="600" />

```Tracker列表
http://tracker.gbitt.info/announce
https://tracker.lilithraws.cf/announce
https://tracker1.520.jp/announce
http://www.wareztorrent.com/announce
https://tr.burnabyhighstar.com/announce
http://tk.greedland.net/announce
http://trackme.theom.nz:80/announce
https://tracker.foreverpirates.co:443/announce
http://tracker3.ctix.cn:8080/announce
https://tracker.m-team.cc/announce.php
https://tracker.gbitt.info:443/announce
https://tracker.loligirl.cn/announce
https://tp.m-team.cc:443/announce.php
https://tr.abir.ga/announce
http://tracker.electro-torrent.pl/announce
http://1337.abcvg.info/announce
https://trackme.theom.nz:443/announce
https://tracker.tamersunion.org:443/announce
https://tr.abiir.top/announce
wss://tracker.openwebtorrent.com:443/announce
http://www.all4nothin.net:80/announce.php
https://tracker.kuroy.me:443/announce
https://1337.abcvg.info:443/announce
http://torrentsmd.com:8080/announce
https://tracker.gbitt.info/announce
udp://tracker.sylphix.com:6969/announce
```

2. 配置 AutoBangumi

浏览器打开固定的局域网 IP:7892，比如我的是http://192.168.123.66:7892/

默认用户名：admin，默认密码：adminadmin

<img src="/post_pic/android-autobangumi-AB-login.png" alt="AB-login" data-fancybox="gallery" width="600" />

进入后点击左侧齿轮配置下载设置和代理设置

下载配置主要对接 qBittorrent，代理设置主要优化 RSS 订阅的可靠性

<img src="/post_pic/android-autobangumi-AB-setting.png" alt="AB-setting" data-fancybox="gallery" width="600" />

3. 配置 Jellyfin

这里推荐使用客户端，因为网页需要服务端编码，画质损失不说，chroot 环境下只能用 cpu 软编码，实际使用体验非常差。

[桌面端：Jellyfin Media Player](https://github.com/jellyfin/jellyfin-media-player/releases)

[Android 客户端：Findroid](https://github.com/jarnedemeulemeester/findroid/releases)

主要是配置 Bangumi 插件获取番剧 TMDb，可参考以下文章，转码部分可跳过

[利用 Jellyfin + Bangumi 打造更舒适的动画媒体库](https://www.himiku.com/archives/deploy-a-more-comfortable-animation-library-with-jellyfin-and-bangumi.html)

<img src="/post_pic/android-autobangumi-jellyfin1.png" alt="jellyfin" data-fancybox="gallery" width="600" />
<img src="/post_pic/android-autobangumi-jellyfin2.png" alt="jellyfin" data-fancybox="gallery" width="600" />
<img src="/post_pic/android-autobangumi-jellyfin3.png" alt="jellyfin" data-fancybox="gallery" width="600" />
<img src="/post_pic/android-autobangumi-jellyfin4.png" alt="jellyfin" data-fancybox="gallery" width="600" />

配置完后的效果展示，还是很有 b 格的 😋

# 五、可选优化

1. 控制充电阈值

既然已经把手机作为服务器用了，24 小时通电是必须的，但手机还带着电池，一直满电时间长了鼓包不说，也不太安全。
这里提供两种解决思路，一种是硬件方面的修改，将手机改为直供电，某宝上有卖。另一种就是使用软件控制充电，例如 Magisk 模块[Advanced Charging Controller](https://github.com/VR-25/acc)

本次测试手机安装完 ACC 模块后在终端输入`acc 3900`后即可控制电量在 50% 左右

<img src="/post_pic/android-autobangumi-acc.png" alt="acc" data-fancybox="gallery" height="600" />

# 结语

其实在大概两个月前就跑通了以上流程，之后一直没有时间记录。而两个月时间也没出什么大的问题，稳定性还是可以的，最后附上截至文章完成时的运行状态

<img src="/post_pic/android-autobangumi-uptime.png" alt="uptime" data-fancybox="gallery" width="600" />
