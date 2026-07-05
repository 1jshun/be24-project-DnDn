import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useSiteStore = defineStore('site', () => {
  const sites = ref([
    {
      id: 'GN-A-01',
      name: '강남구 재건축 A공구',
      address: '서울 강남구 역삼동',
      period: '2025.01.01 ~ 2026.12.31',
      manager: '김철수',
      managerPhone: '010-1234-5678',
      partners: 5,
      currentWorkers: 124,
      maxWorkers: 145,
      status: '운영 중',
      statusCode: 'active',
    },
    {
      id: 'PG-D-02',
      name: '판교 테크노밸리 데이터센터',
      address: '경기 성남시 분당구',
      period: '2025.03.15 ~ 2027.06.30',
      manager: '이영희',
      managerPhone: '010-9876-5432',
      partners: 12,
      currentWorkers: 350,
      maxWorkers: 350,
      status: '운영 중',
      statusCode: 'active',
    },
    {
      id: 'IC-L-03',
      name: '인천항 물류센터 신축',
      address: '인천 중구 연안동',
      period: '2024.10.01 ~ 2026.05.31',
      manager: '박준호',
      managerPhone: '010-1111-2222',
      partners: 3,
      currentWorkers: 85,
      maxWorkers: 100,
      status: '마감 필요',
      statusCode: 'warning',
    },
  ])

  const addSite = (site) => {
    sites.value.unshift(site)
  }

  return { sites, addSite }
})
