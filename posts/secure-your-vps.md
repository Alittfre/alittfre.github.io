---
title: VPS安全配置指南：从零开始构建防护体系
date: 2025-2-2
tags: [好文翻译™, Linux, VPS, 安全, 防火墙, UFW, Fail2Ban]
head:
  - - meta
    - name: description
      content: 本文涵盖从用户权限管控到自动化漏洞修复的全流程。通过7个关键步骤，你将打造一个抵御常见攻击的可靠环境。

  - - meta
    - name: keywords
      content: Linux VPS 安全 防火墙 UFW Fail2Ban
---

本文涵盖从用户权限管控到自动化漏洞修复的全流程。通过 7 个关键步骤，你将打造一个抵御常见攻击的可靠环境。

---

::: tip
本文原作者为[Kyri](https://substack.com/@kkyri)，原文链接：https://www.kkyri.com/p/how-to-secure-your-new-vps-a-step-by-step-guide

This article was originally published by [Kyri](https://substack.com/@kkyri), Original link: https://www.kkyri.com/p/how-to-secure-your-new-vps-a-step-by-step-guide
:::

# 引言

你刚刚入手了一台 $5 的 VPS。现在你手头只有 VPS 的 IP 地址、用户名和密码，下一步应该做什么？
本文将手把手教你从零开始强化 VPS 的安全性，涵盖基础的防护措施和进阶安全策略。从用户权限管理、SSH 安全配置、防火墙规则设置，到部署自动化工具以确保服务器始终处于防护状态，我们将逐一演示关键步骤。
注：本文以 Ubuntu 系统为例，适用于经济型 VPS 服务商（此类服务商通常不提供预先配置的安全设置）。如果你在使用 AWS、Azure 等主流云平台，部分操作可能已经预先配置，可直接跳过相关配置。

# 安全访问配置

### 首要任务：更新服务器系统

首先，通过服务商提供的 IP 地址和凭据连接 VPS：

```bash
ssh root@12.34.56.78
```

> 将 root 和 12.34.56.78 替换为你的实际用户名与 IP 地址

然后根据提示输入密码完成认证。
成功登录后，立即将系统更新至最新版本：

```bash
sudo apt update
sudo apt upgrade -y
```

这将确保所有已安装软件均为最新安全版本，消除已知漏洞风险。

### 创建普通用户

如果服务商提供给你 root 用户，那么请立即创建一个独立的普通用户来连接和管理你的服务器。

```bash
sudo adduser username
```

> 'username'为你新创建的用户名

终端将会提示你设置并确认新用户的密码，并可能要求你提供其他附加信息，如果你暂时不想设置这些附加信息，直接回车跳过即可。
接下来，赋予新用户 sudo 权限。

```bash
sudo usermod -aG sudo username
```

现在切换到新用户并验证 sudo 权限：

```bash
su - username
sudo whoami
```

如果终端返回`root`，则代表成功为新用户配置了 sudo 权限。

### 配置 SSH 认证

你最初通过密码认证方式连接到服务器。为提高安全性，我们将改用基于密钥的身份验证——首先生成 SSH 密钥对，随后彻底禁用密码登录功能。

在你**本地的电脑**上生成密钥对：

```bash
ssh-keygen -t ed25519 -C "email@example.com"
```

> 将"email@example.com"替换为你自己的邮箱地址

按下回车将密钥存放到默认位置。另外，你可以选择输入一个口令，这样做的话每次连接 VPS 都需要输入口令。我个人为了方便将其留空。

接下来，从你本地的电脑复制公钥到 VPS：

```bash
ssh-copy-id -i ~/.ssh/ed25519.pub username@12.34.56.78
```

> 将`username`和`12.34.56.78`替换为你实际的信息

按照提示输入密码。

验证密钥对连接并：

```bash
ssh -i ~/.ssh/ed25519 -o PasswordAuthentication=no username@12.34.56.78
```

:::details
-o PasswordAuthentication=no 在本次连接中禁用密码认证
:::

为了避免每次连接都需要指定密钥路径，将密钥添加到 SSH 代理：

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/ed25519
```

现在你可以通过 SSH 连接 VPS：

```bash
ssh username@12.34.56.78
```

（可选）为了更便利的连接 VPS，你可以增加 alias 到 ~/.bashrc 或 ~/.zshrc：

```bash
alias ssh-vps='ssh username@12.34.56.78'
```

之后保存修改，然后 source 一下 ~/.bashrc 或 ~/.zshrc 让其立即生效：

```bash
source ~/.zshrc
```

现在你可以直接在终端执行`ssh-vps`连接你的 VPS。

### 禁用密码认证

现在你开启了 SSH 密钥连接，是时候禁用密码认证和 root 用户登录。首先，使用新创建的用户登录你的 VPS：

```bash
ssh username@12.34.56.78
```

编辑 SSH 进程配置文件：

```bash
sudo vim /etc/ssh/sshd_config
```

进行以下操作：

1. 找到 `PermitRootLogin yes` 并修改为 `PermitRootLogin no`
2. 找到 `ChallengeResponseAuthentication` 并设置为 `no`
3. 找到 `PasswordAuthentication` 并设置为 `no`
4. 找到 `UsePAM` 并设置为 `no`

你的`sshd_config`应该包含以下几行：

> PermitRootLogin no
>
> ChallengeResponseAuthentication no
>
> PasswordAuthentication no
>
> UsePAM no

之后保存并退出。

::: warning
注意：在进行以上操作前，确保你创建了非 root 用户并按照之前的章节配置了 SSH 密钥连接，不然你可能会被你自己的 VPS 拒之门外。
:::

重启 SSH 进程以应用修改：

```bash
sudo service sshd reload
```

验证 root 登录是否被禁用。在你**本地的电脑**上尝试以 root 用户登录：

```bash
ssh root@12.34.56.78
```

root 登录将失败并提示 `Permission denied`

# VPS 安全加固

### 配置防火墙

防火墙对于阻止未经过授权的访问至关重要。我们将遵循最小权限的原则，只开放我们需要的端口。

安装 UFW（Uncomplicated Firewall）：

```bash
sudo apt install ufw
```

查看防火墙状态

```bash
sudo ufw status verbose
```

此时应该为未活动状态，如果不是，暂时禁用 UFW：

```bash
sudo ufw disable
```

查看已知的 UFW 策略：

```bash
sudo ufw app list
```

**放行 OpenSSH（这对维持 SSH 连接至关重要）**

```bash
sudo ufw allow 'OpenSSH'
```

::: warning
**再次检查 OpenSSH 是否被放行（以防被拒之门外）**：
:::

```bash
sudo ufw show added
```

你应该能看到以下内容：

```bash
ufw allow OpenSSH
```

**如果没有看到以上输出，请停止操作并检查上述步骤。**

设置默认规则：

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

这将放行所有出站流量，但拒绝所有入站流量（除了 SSH）。
（可选）如果你计划部署 Web 服务，放行 80 和 433 端口：

```bash
sudo ufw allow 'Nginx Full'
```

最后，启用防火墙：

```bash
sudo ufw enable
```

::: warning
注意：系统可能警告 SSH 连接会受到影响。如果你确定 OpenSSH 已被防火墙放行（如前文强调），那么可以放心继续操作，输入 y 跳过警告。
:::

查看防火墙运行状态：

```bash
sudo ufw status verbose
```

```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
22/tcp (OpenSSH)           ALLOW IN    Anywhere
22/tcp (OpenSSH (v6))      ALLOW IN    Anywhere (v6)
```

现在你的 VPS 处于防火墙的保护下。

### 配置 Fail2Ban

Fail2Ban 通过监控登录日志以禁止那些登录失败次数过多的 IP 地址。我们将配置 Fail2Ban 监控 SSH 连接行为。

安装 Fail2Ban：

```bash
sudo apt install fail2ban
```

查看运行状态（默认是 disabled）：

```bash
sudo systemctl status fail2ban.service
```

```
○ fail2ban.service - Fail2Ban Service
     Loaded: loaded (/lib/systemd/system/fail2ban.service; disabled; vendor preset: enabled)
     Active: inactive (dead)
       Docs: man:fail2ban(1)
```

在启用 Fail2Ban 之前，需要先配置其监控 SSH 访问日志。

转到 Fail2Ban 配置目录：

```bash
cd /etc/fail2ban
```

创建一个 local 配置文件：

```bash
sudo cp jail.conf jail.local
```

编辑配置文件：

```bash
sudo vim jail.local
```

在`[sshd]`配置项添加或修改以下内容：

```
[sshd]
enabled = true
mode = aggressive
...
```

这会开启 SSH 监控并将其设置的更加激进以应对更广泛的潜在威胁。
你也可以自由探索并调整其他必要的设置。默认设置应该就能应对大多数情况。当你调整完毕时，保存并关闭文件。

设置 Fail2Ban 开机自启：

```bash
sudo systemctl enable fail2ban
```

手动启动 Fail2Ban：

```bash
sudo systemctl start fail2ban
```

查看运行状态：

```bash
sudo systemctl status fail2ban
```

（可选）为了检查 Fail2Ban 是否正常工作，你可以尝试使用错误的 SSH 密钥多次连接 VPS。当 IP 被禁止连接时，错误提示应该由 `Permission denied` 变为 `Connection refused`。
::: warning
执行以上测试时请改变 IP 以免你目前的 IP 被禁止连接 VPS。如果被禁止连接，默认的禁止时间是 10 分钟。
:::

你的 VPS 现在有额外的防护来防御暴力攻击。

# 自动化繁琐的操作

### 保持安全：自动升级安全补丁

Ubuntu 提供了 `unattended-upgrades` 工具，可以为你的 VPS 自动接收并安装安全补丁和必要的升级。

安装 `unattended-upgrades` （如果未预先安装）：

```bash
sudo apt install unattended-upgrades
```

查看运行状态：

```bash
sudo systemctl status unattended-upgrades.service
```

（可选）配置自动重启，一些升级需要重启服务器生效。默认情况下，自动重启不会启用。为了开启自动重启，打开配置文件：

```bash
sudo vim /etc/apt/apt.conf.d/50unattended-upgrades
```

找到包含 `Unattended-Upgrade::Automatic-Reboot` 的行并设置为 true。

::: warning
开启自动重启会让你的 VPS 服务在重启时暂时不可用。个人建议将其关闭，只在需要时手动重启。当你使用 SSH 登录 VPS 时，你会看到自动重启的信息。
:::

如果你修改完了配置项，重载服务：

```

```

你的 VPS 现在将会时刻处于最新安全补丁和必要升级的状态下。

# 结语：一个安全的 VPS。

恭喜，你的 VPS 安全状态已经远超初始配置。现在让我们回顾一下：

1. 升级服务器的软件到最新的版本。
2. 关闭密码认证并设置更安全的密钥对认证。
3. 安装防火墙控制端口访问。
4. 安装 Fail2Ban 自动拉黑未通过验证的 IP。
5. 配置安全补丁自动化升级。

你已将一个裸奔的 VPS 配置在一个牢固安全的环境中。现在你可以放心部署 SaaS 应用。

祝你运维愉快！
