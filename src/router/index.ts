import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/my-dataframes',
    },
    {
      path: '/my-dataframes',
      name: 'my-dataframes',
      component: () => import('../pages/MyDataFramesPage.vue'),
    },
    {
      path: '/my-dataframes/:id',
      name: 'dataframe-detail',
      component: () => import('../pages/DataFrameDetailPage.vue'),
      props: true,
    },
    {
      path: '/public-dataframes',
      name: 'public-dataframes',
      component: () => import('../pages/PublicDataFramesPage.vue'),
    },
    {
      path: '/shared-dataframes',
      name: 'shared-dataframes',
      component: () => import('../pages/SharedDataFramesPage.vue'),
    },
  ],
})

export default router
