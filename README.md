# Xinhua Messenger

《新华信使：幸福里一平米行动地图》是一个无需登录、打开即可体验的社区漫游 MVP。

## 当前体验范围

- 幸福里周边的风格化街区地图
- 可移动的“新华信使”角色
- WAWA 行动入口、幸福里、小店、口袋花园与行动地图牌
- 三条连续行动任务
- 桌面端键盘移动与手机端轻点移动
- 真实商户、真实人物和二维码暂时使用虚构或占位内容

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
```

## 部署

VPS 容器、`xinhua.denkisan.me` 的 Nginx 入口、HTTPS 启用步骤和回滚方式见
[`deploy/README.md`](deploy/README.md)。

## 数据与内容边界

- 街区位置和道路关系参考 OpenStreetMap，遵循 ODbL 署名要求。
- 街景与第三方图片只作为观察参考，不作为产品素材发布。
- 当前商户和故事均为虚构占位，后续取得合作授权后再替换。
