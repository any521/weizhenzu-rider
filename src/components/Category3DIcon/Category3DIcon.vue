<template>
  <view class="cat3d-icon" :style="wrapStyle">
    <view class="cat3d-icon__inner" :style="innerStyle">
      <!-- 如果有图片URL，使用图片 -->
      <image v-if="config.imageUrl" class="cat3d-icon__img" :src="config.imageUrl" mode="aspectFill" />
      <!-- 否则使用SVG图标 -->
      <CategoryIcon v-else :name="config.svgName" :size="svgSize" color="#fff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CategoryIcon from '@/components/CategoryIcon/CategoryIcon.vue'

interface Props {
  name?: string
  icon?: string
  size?: number
  imageUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  name: '',
  icon: '',
  size: 56,
  imageUrl: '',
})

// 图片基础路径
const IMG_BASE = '/static/icons/category/'

// 分类配置：所有分类都有3D图片（共50个），SVG仅作为降级
const CATEGORY_CONFIG: Record<string, { imageUrl?: string; gradient: string; svgName: string }> = {
  // === 核心餐饮美食类（都有3D图片） ===
  meishi:    { imageUrl: IMG_BASE + 'meishi.jpg',    gradient: 'linear-gradient(145deg, #FF8A65, #FF5722)', svgName: 'food' },
  food:      { imageUrl: IMG_BASE + 'meishi.jpg',    gradient: 'linear-gradient(145deg, #FF7043, #E64A19)', svgName: 'food' },
  huoguo:    { imageUrl: IMG_BASE + 'huoguo.jpg',    gradient: 'linear-gradient(145deg, #EF5350, #C62828)', svgName: 'hotpot' },
  hotpot:    { imageUrl: IMG_BASE + 'huoguo.jpg',    gradient: 'linear-gradient(145deg, #EF5350, #C62828)', svgName: 'hotpot' },
  chuancai:  { imageUrl: IMG_BASE + 'chuancai.jpg',  gradient: 'linear-gradient(145deg, #E53935, #B71C1C)', svgName: 'pepper' },
  barbecue:  { imageUrl: IMG_BASE + 'barbecue.jpg',  gradient: 'linear-gradient(145deg, #FF7043, #BF360C)', svgName: 'bbq' },
  bbq:       { imageUrl: IMG_BASE + 'barbecue.jpg',  gradient: 'linear-gradient(145deg, #FF7043, #BF360C)', svgName: 'bbq' },
  xiaolongxia:{imageUrl: IMG_BASE + 'xiaolongxia.jpg',gradient: 'linear-gradient(145deg, #F44336, #C62828)', svgName: 'seafood' },
  malaxiangguo:{imageUrl:IMG_BASE+'malaxiangguo.jpg',gradient: 'linear-gradient(145deg, #FF5722, #D32F2F)', svgName: 'hotpot' },
  chuanchuan:{ imageUrl: IMG_BASE + 'chuanchuan.jpg',gradient: 'linear-gradient(145deg, #FF5252, #D32F2F)', svgName: 'bbq' },

  // 快餐简餐类
  kuaican:   { imageUrl: IMG_BASE + 'kuaican.jpg',   gradient: 'linear-gradient(145deg, #FFB74D, #F57C00)', svgName: 'food' },
  taocan:    { imageUrl: IMG_BASE + 'taocan.jpg',    gradient: 'linear-gradient(145deg, #FFA726, #EF6C00)', svgName: 'food' },
  hanbao:    { imageUrl: IMG_BASE + 'hanbao.jpg',    gradient: 'linear-gradient(145deg, #FFA726, #F57C00)', svgName: 'burger' },
  burger:    { imageUrl: IMG_BASE + 'hanbao.jpg',    gradient: 'linear-gradient(145deg, #FFA726, #F57C00)', svgName: 'burger' },
  jitui:     { imageUrl: IMG_BASE + 'jitui.jpg',     gradient: 'linear-gradient(145deg, #FF8A65, #E65100)', svgName: 'food' },
  pizza:     { imageUrl: IMG_BASE + 'pizza.jpg',     gradient: 'linear-gradient(145deg, #FF7043, #D84315)', svgName: 'pizza' },

  // 早餐/早点类
  breakfast: { imageUrl: IMG_BASE + 'breakfast.jpg', gradient: 'linear-gradient(145deg, #FFD54F, #FF8F00)', svgName: 'breakfast' },
  chaocan:   { imageUrl: IMG_BASE + 'breakfast.jpg', gradient: 'linear-gradient(145deg, #FFCC80, #FB8C00)', svgName: 'breakfast' },
  zaocan:    { imageUrl: IMG_BASE + 'breakfast.jpg', gradient: 'linear-gradient(145deg, #FFD54F, #FF8F00)', svgName: 'breakfast' },
  baozi:     { imageUrl: IMG_BASE + 'baozi.jpg',     gradient: 'linear-gradient(145deg, #FFF3E0, #FFE0B2)', svgName: 'food' },
  doujiang:  { imageUrl: IMG_BASE + 'doujiang.jpg',  gradient: 'linear-gradient(145deg, #FFF9C4, #FBC02D)', svgName: 'drink' },
  jianbing:  { imageUrl: IMG_BASE + 'jianbing.jpg',  gradient: 'linear-gradient(145deg, #FFE082, #FFB300)', svgName: 'food' },

  // 面食粥点类
  noodles:   { imageUrl: IMG_BASE + 'noodles.jpg',   gradient: 'linear-gradient(145deg, #FFB74D, #FF8F00)', svgName: 'noodles' },
  mianshi:   { imageUrl: IMG_BASE + 'noodles.jpg',   gradient: 'linear-gradient(145deg, #FFCC80, #FFA000)', svgName: 'noodles' },
  zhou:      { imageUrl: IMG_BASE + 'zhou.jpg',      gradient: 'linear-gradient(145deg, #FFE0B2, #FFB74D)', svgName: 'food' },
  zhoufen:   { imageUrl: IMG_BASE + 'zhou.jpg',      gradient: 'linear-gradient(145deg, #FFE0B2, #FFB300)', svgName: 'food' },
  tang:      { imageUrl: IMG_BASE + 'tang.jpg',      gradient: 'linear-gradient(145deg, #FFCCBC, #FFAB91)', svgName: 'noodles' },

  // 地方菜系/异国料理
  xiaochi:   { imageUrl: IMG_BASE + 'xiaochi.jpg',   gradient: 'linear-gradient(145deg, #FF8A65, #D84315)', svgName: 'food' },
  yuecai:    { imageUrl: IMG_BASE + 'yuecai.jpg',    gradient: 'linear-gradient(145deg, #FFAB91, #FF8A65)', svgName: 'food' },
  dongbeicai:{ imageUrl: IMG_BASE + 'dongbeicai.jpg',gradient: 'linear-gradient(145deg, #FFF8E1, #FFE0B2)', svgName: 'food' },
  sushi:     { imageUrl: IMG_BASE + 'sushi.jpg',     gradient: 'linear-gradient(145deg, #EF9A9A, #C62828)', svgName: 'sushi' },
  riliao:    { imageUrl: IMG_BASE + 'sushi.jpg',     gradient: 'linear-gradient(145deg, #F48FB1, #AD1457)', svgName: 'sushi' },
  dongnanya: { imageUrl: IMG_BASE + 'dongnanya.jpg', gradient: 'linear-gradient(145deg, #FFAB91, #FF8A65)', svgName: 'food' },
  seafood:   { imageUrl: IMG_BASE + 'seafood.jpg',   gradient: 'linear-gradient(145deg, #4FC3F7, #0277BD)', svgName: 'seafood' },
  salad:     { imageUrl: IMG_BASE + 'salad.jpg',     gradient: 'linear-gradient(145deg, #9CCC65, #33691E)', svgName: 'salad' },

  // 甜品饮品类
  dessert:   { imageUrl: IMG_BASE + 'dessert.jpg',   gradient: 'linear-gradient(145deg, #F8BBD0, #EC407A)', svgName: 'cake' },
  tianpin:   { imageUrl: IMG_BASE + 'dessert.jpg',   gradient: 'linear-gradient(145deg, #F48FB1, #D81B60)', svgName: 'cake' },
  cake:      { imageUrl: IMG_BASE + 'dessert.jpg',   gradient: 'linear-gradient(145deg, #FFAB91, #F48FB1)', svgName: 'cake' },
  icecream:  { imageUrl: IMG_BASE + 'icecream.jpg',  gradient: 'linear-gradient(145deg, #81D4FA, #039BE5)', svgName: 'icecream' },
  coffee:    { imageUrl: IMG_BASE + 'coffee.jpg',    gradient: 'linear-gradient(145deg, #A1887F, #4E342E)', svgName: 'coffee' },
  naicha:    { imageUrl: IMG_BASE + 'naicha.jpg',    gradient: 'linear-gradient(145deg, #CE93D8, #7B1FA2)', svgName: 'drink' },
  drink:     { imageUrl: IMG_BASE + 'drink.jpg',     gradient: 'linear-gradient(145deg, #BA68C8, #8E24AA)', svgName: 'drink' },
  yinliao:   { imageUrl: IMG_BASE + 'drink.jpg',     gradient: 'linear-gradient(145deg, #9575CD, #512DA8)', svgName: 'drink' },
  beer:      { imageUrl: IMG_BASE + 'beer.jpg',      gradient: 'linear-gradient(145deg, #FFD54F, #F9A825)', svgName: 'drink' },
  wine:      { imageUrl: IMG_BASE + 'wine.jpg',      gradient: 'linear-gradient(145deg, #BA68C8, #6A1B9A)', svgName: 'drink' },

  // 生鲜商超类
  shengxian: { imageUrl: IMG_BASE + 'shengxian.jpg', gradient: 'linear-gradient(145deg, #EF5350, #C62828)', svgName: 'food' },
  fruit:     { imageUrl: IMG_BASE + 'fruit.jpg',     gradient: 'linear-gradient(145deg, #81C784, #2E7D32)', svgName: 'apple' },
  shuiguo:   { imageUrl: IMG_BASE + 'fruit.jpg',     gradient: 'linear-gradient(145deg, #66BB6A, #2E7D32)', svgName: 'apple' },
  vegetable: { imageUrl: IMG_BASE + 'vegetable.jpg', gradient: 'linear-gradient(145deg, #AED581, #558B2F)', svgName: 'vegetable' },
  store:     { imageUrl: IMG_BASE + 'store.jpg',     gradient: 'linear-gradient(145deg, #64B5F6, #1565C0)', svgName: 'cart' },
  supermarket:{imageUrl: IMG_BASE + 'store.jpg',     gradient: 'linear-gradient(145deg, #64B5F6, #1565C0)', svgName: 'cart' },
  chaoshi:   { imageUrl: IMG_BASE + 'store.jpg',     gradient: 'linear-gradient(145deg, #4FC3F7, #0288D1)', svgName: 'cart' },
  lingshi:   { imageUrl: IMG_BASE + 'lingshi.jpg',   gradient: 'linear-gradient(145deg, #FFD54F, #FF8F00)', svgName: 'food' },

  // 医药/鲜花/礼品
  pharmacy:  { imageUrl: IMG_BASE + 'pharmacy.jpg',  gradient: 'linear-gradient(145deg, #26C6DA, #006064)', svgName: 'medical' },
  yaopin:    { imageUrl: IMG_BASE + 'pharmacy.jpg',  gradient: 'linear-gradient(145deg, #4DD0E1, #00838F)', svgName: 'medical' },
  flower:    { imageUrl: IMG_BASE + 'flower.jpg',    gradient: 'linear-gradient(145deg, #F48FB1, #C2185B)', svgName: 'flower' },
  xianhua:   { imageUrl: IMG_BASE + 'flower.jpg',    gradient: 'linear-gradient(145deg, #F48FB1, #C2185B)', svgName: 'flower' },
  techan:    { imageUrl: IMG_BASE + 'techan.jpg',    gradient: 'linear-gradient(145deg, #FFCC80, #FF8A65)', svgName: 'gift' },

  // 生活服务/零售类
  yexiao:    { imageUrl: IMG_BASE + 'yexiao.jpg',    gradient: 'linear-gradient(145deg, #7E57C2, #311B92)', svgName: 'bbq' },
  brand:     { imageUrl: IMG_BASE + 'brand.jpg',     gradient: 'linear-gradient(145deg, #FFB300, #FF8F00)', svgName: 'star' },
  errand:    { imageUrl: IMG_BASE + 'errand.jpg',    gradient: 'linear-gradient(145deg, #66BB6A, #2E7D32)', svgName: 'run' },
  muying:    { imageUrl: IMG_BASE + 'muying.jpg',    gradient: 'linear-gradient(145deg, #F8BBD0, #F48FB1)', svgName: 'baby' },
  chongwu:   { imageUrl: IMG_BASE + 'chongwu.jpg',   gradient: 'linear-gradient(145deg, #BCAAA4, #8D6E63)', svgName: 'paw' },
  wenju:     { imageUrl: IMG_BASE + 'wenju.jpg',     gradient: 'linear-gradient(145deg, #FFD54F, #FBC02D)', svgName: 'book' },
  shuma:     { imageUrl: IMG_BASE + 'shuma.jpg',     gradient: 'linear-gradient(145deg, #78909C, #37474F)', svgName: 'phone' },
  meizhuang: { imageUrl: IMG_BASE + 'meizhuang.jpg', gradient: 'linear-gradient(145deg, #F48FB1, #F06292)', svgName: 'beauty' },

  // 功能入口
  more:      { imageUrl: IMG_BASE + 'more.jpg',      gradient: 'linear-gradient(145deg, #90CAF9, #1565C0)', svgName: 'more' },
  quanbu:    { imageUrl: IMG_BASE + 'more.jpg',      gradient: 'linear-gradient(145deg, #90CAF9, #1565C0)', svgName: 'more' },
  all:       { imageUrl: IMG_BASE + 'more.jpg',      gradient: 'linear-gradient(145deg, #90CAF9, #1565C0)', svgName: 'more' },
}

// 根据名称模糊匹配分类
function matchByName(name: string): { imageUrl?: string; gradient: string; svgName: string } {
  if (/火锅|麻辣烫|串串香/.test(name)) return CATEGORY_CONFIG.huoguo
  if (/川菜|湘菜|辣|麻辣/.test(name)) return CATEGORY_CONFIG.chuancai
  if (/烧烤|烤肉|烤串/.test(name)) return CATEGORY_CONFIG.barbecue
  if (/炸鸡|炸串/.test(name)) return CATEGORY_CONFIG.jitui
  if (/小龙虾|龙虾/.test(name)) return CATEGORY_CONFIG.xiaolongxia
  if (/香锅|麻辣香锅/.test(name)) return CATEGORY_CONFIG.malaxiangguo
  if (/串串|串/.test(name)) return CATEGORY_CONFIG.chuanchuan
  if (/披萨|比萨/.test(name)) return CATEGORY_CONFIG.pizza
  if (/寿司|日料|日本料理/.test(name)) return CATEGORY_CONFIG.sushi
  if (/海鲜|水产/.test(name)) return CATEGORY_CONFIG.seafood
  if (/沙拉|轻食|素食|减脂/.test(name)) return CATEGORY_CONFIG.salad
  if (/东南亚|泰国|越南/.test(name)) return CATEGORY_CONFIG.dongnanya
  if (/粤菜|茶餐厅|港式|早茶|点心/.test(name)) return CATEGORY_CONFIG.yuecai
  if (/东北菜|东北|饺子|水饺/.test(name)) return CATEGORY_CONFIG.dongbeicai
  if (/粥|稀饭/.test(name)) return CATEGORY_CONFIG.zhou
  if (/包子|小笼包/.test(name)) return CATEGORY_CONFIG.baozi
  if (/豆浆/.test(name)) return CATEGORY_CONFIG.doujiang
  if (/煎饼|果子/.test(name)) return CATEGORY_CONFIG.jianbing
  if (/早餐|早点|早茶/.test(name)) return CATEGORY_CONFIG.breakfast
  if (/汤|炖汤/.test(name)) return CATEGORY_CONFIG.tang
  if (/面|粉|米线|拉面|意大利面/.test(name)) return CATEGORY_CONFIG.noodles
  if (/快餐|简餐|便当|盖饭|米饭|炒饭/.test(name)) return CATEGORY_CONFIG.kuaican
  if (/套餐|盒饭/.test(name)) return CATEGORY_CONFIG.taocan
  if (/汉堡|薯条|肯德基|麦当劳/.test(name)) return CATEGORY_CONFIG.hanbao
  if (/鸡腿|鸡翅|炸鸡/.test(name)) return CATEGORY_CONFIG.jitui
  if (/小吃|关东煮/.test(name)) return CATEGORY_CONFIG.xiaochi
  if (/甜品|甜点|烘焙|面包|西点/.test(name)) return CATEGORY_CONFIG.dessert
  if (/蛋糕|生日蛋糕/.test(name)) return CATEGORY_CONFIG.cake
  if (/奶茶|奶盖|茶饮/.test(name)) return CATEGORY_CONFIG.naicha
  if (/饮品|饮料|果汁|汽水/.test(name)) return CATEGORY_CONFIG.drink
  if (/咖啡|星巴克|瑞幸/.test(name)) return CATEGORY_CONFIG.coffee
  if (/冰淇淋|冰激凌|雪糕|冰棒/.test(name)) return CATEGORY_CONFIG.icecream
  if (/啤酒/.test(name)) return CATEGORY_CONFIG.beer
  if (/酒|红酒|白酒|洋酒/.test(name)) return CATEGORY_CONFIG.wine
  if (/水果/.test(name)) return CATEGORY_CONFIG.fruit
  if (/蔬菜|青菜|胡萝卜|菜市场/.test(name)) return CATEGORY_CONFIG.vegetable
  if (/生鲜|果蔬/.test(name)) return CATEGORY_CONFIG.shengxian
  if (/超市|便利|百货|商店|小卖部/.test(name)) return CATEGORY_CONFIG.store
  if (/零食|爆米花|辣条/.test(name)) return CATEGORY_CONFIG.lingshi
  if (/药|医药|健康|药房|药店/.test(name)) return CATEGORY_CONFIG.pharmacy
  if (/鲜花|花|花艺|花束/.test(name)) return CATEGORY_CONFIG.flower
  if (/特产|伴手礼|地方特色/.test(name)) return CATEGORY_CONFIG.techan
  if (/夜宵|宵夜|夜市/.test(name)) return CATEGORY_CONFIG.yexiao
  if (/母婴|婴儿|奶粉|纸尿裤/.test(name)) return CATEGORY_CONFIG.muying
  if (/宠物|猫|狗|猫粮|狗粮/.test(name)) return CATEGORY_CONFIG.chongwu
  if (/文具|办公|笔|本子/.test(name)) return CATEGORY_CONFIG.wenju
  if (/数码|家电|手机|电脑|3C/.test(name)) return CATEGORY_CONFIG.shuma
  if (/美妆|化妆品|护肤|口红|彩妆/.test(name)) return CATEGORY_CONFIG.meizhuang
  if (/品牌|大牌|连锁/.test(name)) return CATEGORY_CONFIG.brand
  if (/跑腿|代购|配送|外卖/.test(name)) return CATEGORY_CONFIG.errand
  if (/美食|餐饮|餐厅|炒菜|家常菜/.test(name)) return CATEGORY_CONFIG.meishi
  if (/全部|更多|其他/.test(name)) return CATEGORY_CONFIG.more
  // 默认美食
  return CATEGORY_CONFIG.meishi
}

const config = computed(() => {
  // 如果传入了imageUrl，优先使用图片
  if (props.imageUrl) {
    return { imageUrl: props.imageUrl, gradient: '', svgName: 'food' }
  }
  // 优先用icon字段匹配
  if (props.icon) {
    const iconKey = props.icon.toLowerCase()
    if (CATEGORY_CONFIG[iconKey]) {
      return CATEGORY_CONFIG[iconKey]
    }
  }
  // 其次用名称匹配
  if (props.name) {
    return matchByName(props.name)
  }
  return CATEGORY_CONFIG.meishi
})

const wrapStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))

const innerStyle = computed(() => ({
  background: config.value.gradient,
  width: `${props.size}px`,
  height: `${props.size}px`,
}))

const svgSize = computed(() => Math.round(props.size * 0.5))
</script>

<style scoped lang="scss">
.cat3d-icon {
  border-radius: 24%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cat3d-icon__inner {
  border-radius: 24%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.18),
    inset 0 2px 6px rgba(255, 255, 255, 0.4),
    inset 0 -3px 6px rgba(0, 0, 0, 0.12);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease;

  &::before {
    content: '';
    position: absolute;
    top: 8%;
    left: 8%;
    width: 45%;
    height: 35%;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 50%;
    filter: blur(8px);
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 5%;
    right: 10%;
    width: 20%;
    height: 15%;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    filter: blur(4px);
  }
}

.cat3d-icon__img {
  width: 100%;
  height: 100%;
  border-radius: 24%;
  z-index: 2;
}

.cat3d-icon__inner :deep(svg) {
  z-index: 2;
  position: relative;
}
</style>
