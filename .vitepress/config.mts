import { defineConfigWithTheme } from 'vitepress'
export interface ThemeConfig {
  //navBar
  menuList: { name: string; url: string }[]

  //banner
  videoBanner: boolean
  name: string
  welcomeText: string
  motto: string[]
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
    // bluearchive font
    [
      'link',
      {
        rel: 'stylesheet',
        href: '/font/Blueaka/Blueaka.css',
      },
    ],
    [
      'link',
      {
        rel: 'stylesheet',
        href: '/font/Blueaka_Bold/Blueaka_Bold.css',
      },
    ],
  ],
  ignoreDeadLinks: true,
  sitemap: {
    hostname: 'https://lin66.site/',
  },
  title: "Alittfre's 部落格",
  description: "Alittfre's 部落格",
  themeConfig: {
    // navBar
    menuList: [
      { name: '首页', url: '' },
      { name: '标签', url: 'tags/' },
    ],

    //banner区配置
    videoBanner: false,
    name: "Alittfre's 部落格",
    welcomeText: 'HelloWorld',
    motto: ['邦邦卡邦 瓦尼瓦尼', 'vanitas vanitatum et omnia vanitas'],
    social: [
      { icon: 'github', url: 'https://github.com/Alittfre' },
      { icon: 'bilibili', url: 'https://space.bilibili.com/7663236' },
    ],

    //footer配置
    footerName: 'Alittfre',
    poweredList: [
      { name: 'GitHub Pages', url: 'https://docs.github.com/pages' },
      { name: 'Cloudflare', url: 'https://www.cloudflare.com/' },
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
