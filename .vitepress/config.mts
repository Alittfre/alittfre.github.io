import { defineConfigWithTheme } from 'vitepress'
export interface ThemeConfig {
  //navBar
  menuList: { name: string; url: string }[]

  //banner
  name: string
  welcomeText: string
  motto: string
  social: { icon: string; url: string }[]

  //footer
  footerName: string
  poweredList: { name: string; url: string }[]

  //gitalk
  clientID: string
  clientSecret: string
  repo: string
  owner: string
  admin: string[]
}

export default defineConfigWithTheme<ThemeConfig>({
  lang: 'zh-CN',
  head: [
    ['link', { rel: 'shortcut icon', href: '/favicon.ico' }],
    // gitalk
    ['link', { rel: 'stylesheet', href: 'https://unpkg.com/gitalk/dist/gitalk.css' }],
    ['script', { src: 'https://unpkg.com/gitalk/dist/gitalk.min.js' }],
  ],
  ignoreDeadLinks: true,
  title: "Alittfre's 部落格",
  description: "Alittfre's 部落格",
  themeConfig: {
    // navBar
    menuList: [
      { name: '首页', url: '' },
      { name: '标签', url: 'tags/' },
    ],

    //banner区配置
    name: "Alittfre's 部落格",
    welcomeText: 'Hello, VitePress',
    motto: "You Forget A Thousand Things Every Day Pal. Make Sure This Is One Of 'Em.",
    social: [
      { icon: 'github', url: 'https://github.com/Alittfre' },
      { icon: 'bilibili', url: 'https://space.bilibili.com/7663236' },
    ],

    //footer配置
    footerName: 'Alittfre',
    poweredList: [
      { name: 'GitHub Pages', url: 'https://docs.github.com/zh/pages' },
      { name: 'Cloudflare', url: 'https://www.cloudflare.com/zh-cn/' },
    ],

    //gitalk配置
    clientID: 'b6b3d66e51f899071b8f',
    clientSecret: '48b95ecc7849d0f2785589c0db80ece42db833c2',
    repo: 'alittfre.github.io',
    owner: 'Alittfre',
    admin: ['Alittfre'],
  },
  markdown: {
    theme: 'github-light',
    lineNumbers: true,
    math: true,
  },
})
