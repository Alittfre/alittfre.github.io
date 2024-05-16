import { defineConfigWithTheme } from 'vitepress'
export interface ThemeConfig {
  //banner
  name: string
  welcomeText: string
  motto: string
  social: { icon: string; url: string }[]

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
    //banner区配置
    name: "Alittfre's 部落格",
    welcomeText: 'Hello, VitePress',
    motto: "You Forget A Thousand Things Every Day Pal. Make Sure This Is One Of 'Em.",
    social: [
      { icon: 'github', url: 'https://github.com/Alittfre' },
      { icon: 'bilibili', url: 'https://space.bilibili.com/7663236' },
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
