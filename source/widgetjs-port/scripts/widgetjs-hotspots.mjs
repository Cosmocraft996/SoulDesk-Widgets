export const hotspotVariants = [
  ['bangumi', 'bangumi/BangumiWidgetView.vue'],
  ['bilibili-rcmd', 'bilibili-rcmd/BilibiliRcmdWidgetView.vue'],
  ['cls-telegraph', 'cls-telegraph/ClsTelegraphWidgetView.vue'],
];
export const hotspotWidgets = hotspotVariants.map(([name]) => 'hotspot-' + name);
