# 🏗️ DnDn - 건설현장 통합 관리 플랫폼

<p align="center">
  <img src="https://github.com/user-attachments/assets/f0b5506c-1b21-4336-aca4-e05894d0de3c" width="30%"/>
</p>

<p align="center">
  <strong>공정계획부터 작업지시, 공사일보, 인력 배치, 장비 입출차, 기상 관제까지</strong><br/>
  건설현장 운영 데이터를 하나의 흐름으로 연결하는 통합 관리 플랫폼입니다.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-Vue.js_+_Vite-4FC08D?style=flat-square&logo=vue.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/API-Spring_Boot-6DB33F?style=flat-square&logo=springboot&logoColor=white"/>
  <img src="https://img.shields.io/badge/Database-MariaDB-003545?style=flat-square&logo=mariadb&logoColor=white"/>
  <img src="https://img.shields.io/badge/Cache-Redis_Sentinel-DC382D?style=flat-square&logo=redis&logoColor=white"/>
  <img src="https://img.shields.io/badge/Deploy-Kubernetes_/_Jenkins-326CE5?style=flat-square&logo=kubernetes&logoColor=white"/>
</p>

<br/>

---

## 👥 팀원 소개

<div align="center">

| **김민규** | **이한별** | **전민주** | **👑 전성훈(팀장)** | **최승우** |
| :---: | :---: | :---: | :---: | :---: |
| <img src="https://avatars.githubusercontent.com/u/244694024?v=4" width="120" style="border-radius:50%"/> | <img src="https://github.com/user-attachments/assets/6ef50d1f-c6b5-4946-acb5-847bd5e552a0" width="120" style="border-radius:50%"/> | <img src="https://github.com/user-attachments/assets/f675522f-6f1f-4644-87fa-b9b0443b975f" width="120" style="border-radius:50%"/> | <img src="https://avatars.githubusercontent.com/u/153381713?s=64&v=4" width="120" style="border-radius:50%"/> | <img src="https://avatars.githubusercontent.com/u/140137784?s=64&v=4" width="120" style="border-radius:50%"/> |
| [@luel1018](https://github.com/luel1018) | [@sole0724](https://github.com/sole0714) | [@minju0077](https://github.com/minju0077) | [@1jshun](https://github.com/1jshun) | [@sw-oo](https://github.com/sw-oo) |

</div>

---

## 📌 목차

> ### 🔗 [01. 바로가기](#01-바로가기)
>
> ### 🛠️ [02. 기술 스택](#02-기술-스택)
>
> ### 🧱 [03. 프로젝트 소개](#03-프로젝트-소개)
>
> ### 🧭 [04. 서비스 개요](#04-서비스-개요)
>
> ### ▶️ [05. 실행 방법](#05-실행-방법)
>
> ### 🚀 [06. 무중단 배포 전략](#06-무중단-배포-전략-bluegreen)
>
> ### 💬 [07. 회고](#07-회고)

---

<a id="01-바로가기"></a>
<details open>
<summary><h2>01. 🔗 바로가기</h2></summary>

| 구분 | 링크 |
| :--- | :--- |
| **🌐 서비스 페이지** | [www.dndn24.kro.kr](https://www.dndn24.kro.kr) |
| **📖 API 명세서** | [Swagger UI](https://api.dndn24.kro.kr/swagger-ui/index.html) |
| **📚 Wiki** | [DnDn Wiki](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-FE/wiki) |
| **🏗️ 시스템 아키텍처** | [System Architecture](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-FE/wiki/System-Architecture) |
| **🖥️ 상세 서비스 화면** | [Service Screens](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-FE/wiki/Service-Screens) |
| **🎨 화면 설계서** | [Figma](https://www.figma.com/design/3qUOzFW9Z5LsfDC3M57mxj/Untitled?t=AWaj1tmgtFtOj7Ns-1) |

</details>

---

<a id="02-기술-스택"></a>
<details open>
<summary><h2>02. 🛠️ 기술 스택</h2></summary>

### Frontend

| 분류 | 기술 |
| :--- | :--- |
| Core | ![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=flat-square&logo=vue.js&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black) |
| Build Tool | ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) |
| API Client | ![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white) |
| UI / Icons | ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white) ![Lucide](https://img.shields.io/badge/Lucide_Icons-111827?style=flat-square) |
| Visualization | ![Dashboard](https://img.shields.io/badge/Dashboard_UI-0F172A?style=flat-square) ![Chart](https://img.shields.io/badge/Chart_View-2563EB?style=flat-square) |

### Backend API 연동

| 분류 | 기술 |
| :--- | :--- |
| Backend | ![Java 17](https://img.shields.io/badge/Java_17-007396?style=flat-square&logo=openjdk&logoColor=white) ![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat-square&logo=springboot&logoColor=white) |
| Security | ![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=flat-square&logo=springsecurity&logoColor=white) |
| ORM | ![Spring Data JPA](https://img.shields.io/badge/Spring_Data_JPA-6DB33F?style=flat-square&logo=hibernate&logoColor=white) |
| API Docs | ![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black) |

### Data / External API

| 분류 | 기술 |
| :--- | :--- |
| Database | ![MariaDB](https://img.shields.io/badge/MariaDB-003545?style=flat-square&logo=mariadb&logoColor=white) |
| Cache / Lock | ![Redis Sentinel](https://img.shields.io/badge/Redis_Sentinel-DC382D?style=flat-square&logo=redis&logoColor=white) ![Redisson](https://img.shields.io/badge/Redisson-DC382D?style=flat-square&logo=redis&logoColor=white) |
| Storage | ![AWS S3](https://img.shields.io/badge/AWS_S3-569A31?style=flat-square&logo=amazons3&logoColor=white) |
| Weather API | ![KMA](https://img.shields.io/badge/KMA_Weather_API-2F80ED?style=flat-square) ![AirKorea](https://img.shields.io/badge/AirKorea_API-00A3E0?style=flat-square) |
| AI API | ![OpenAI](https://img.shields.io/badge/OpenAI_API-412991?style=flat-square&logo=openai&logoColor=white) |

### Infrastructure / DevOps

| 분류 | 기술 |
| :--- | :--- |
| Container | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) |
| Orchestration | ![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat-square&logo=kubernetes&logoColor=white) |
| CI/CD | ![Jenkins](https://img.shields.io/badge/Jenkins-D24939?style=flat-square&logo=jenkins&logoColor=white) |
| Gateway | ![Nginx Ingress](https://img.shields.io/badge/Nginx_Ingress-009639?style=flat-square&logo=nginx&logoColor=white) |
| Deployment | ![Blue Green](https://img.shields.io/badge/Blue--Green_Deployment-brightgreen?style=flat-square) |
| Monitoring | ![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=flat-square&logo=prometheus&logoColor=white) ![Grafana](https://img.shields.io/badge/Grafana-F46800?style=flat-square&logo=grafana&logoColor=white) ![Kiali](https://img.shields.io/badge/Kiali-1F80E0?style=flat-square) |
| Storage Class | ![Longhorn](https://img.shields.io/badge/Longhorn-FFB000?style=flat-square&logo=linuxfoundation&logoColor=white) |

### Collaboration

| 분류 | 기술 |
| :--- | :--- |
| Version Control | ![Git](https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white) ![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white) |
| API Test | ![Postman](https://img.shields.io/badge/Postman-FF6C37?style=flat-square&logo=postman&logoColor=white) |
| Design / Docs | ![Figma](https://img.shields.io/badge/Figma-F24E1E?style=flat-square&logo=figma&logoColor=white) ![Notion](https://img.shields.io/badge/Notion-000000?style=flat-square&logo=notion&logoColor=white) |
| Communication | ![Discord](https://img.shields.io/badge/Discord-5865F2?style=flat-square&logo=discord&logoColor=white) |

</details>

---

<a id="03-프로젝트-소개"></a>
<details open>
<summary><h2>03. 🧱 프로젝트 소개</h2></summary>

**DnDn**은 건설 현장에서 분리되어 관리되던 공정 일정, 작업지시, 공사일보, 인력 배치, 문서 관리, 장비 입출차, 기상 위험 요소를 하나의 업무 흐름으로 연결하는 **건설현장 통합 관리 플랫폼**입니다.

현장 관리자는 공정계획을 기준으로 작업지시를 등록하고, 작업 수행 결과를 공사일보로 확인할 수 있습니다. 작업구역별 근무자 배치와 투입 인력 현황을 함께 관리하여, 어떤 작업에 어떤 인력이 배치되었는지 한 화면 흐름 안에서 파악할 수 있습니다.

또한 공사 관련 문서 업로드와 공사일보 PDF 다운로드를 통해 현장 운영 자료를 관리할 수 있으며, 계정 및 현장 관리 기능을 통해 본사와 현장 사용자의 접근 권한과 공사현장 정보를 체계적으로 운영할 수 있습니다.

작업지시에 포함된 작업 위치와 투입 장비 정보는 장비 입출차, 기상 관제, ESG 대시보드와 연결됩니다. 이를 통해 현장 관리자는 당일 작업과 장비 투입 현황을 기준으로 기상 위험 요소를 확인하고, 본사는 현장별 공정 진행 상황과 운영 데이터를 동일한 기준으로 조회할 수 있습니다.

DnDn은 단순히 여러 관리 화면을 모아둔 서비스가 아니라, **공정계획 → 작업지시 → 공사일보 → 인력·문서·장비·기상·ESG 관리**로 이어지는 건설 현장의 실제 운영 흐름을 웹에서 통합적으로 관리하는 것을 목표로 합니다.

<p align="center">
  <sub>공정계획 → 작업지시 → 공사일보 → 인력 배치 · 문서 관리 · 장비 입출차 · 기상 관제 · ESG 대시보드</sub>
</p>

</details>

---

<a id="04-서비스-개요"></a>
<details open>
<summary><h2>04. 🧭 서비스 개요</h2></summary>

DnDn Frontend는 사용자가 로그인 후 조회할 공사현장을 선택하고, 선택한 현장을 기준으로 현장 운영에 필요한 주요 메뉴를 사용할 수 있도록 구성했습니다.  
각 화면은 독립적으로 동작하면서도 공정계획, 작업지시, 공사일보 데이터를 중심으로 서로 연결됩니다.

| 구분             | 설명 |
|:---------------| :--- |
| [**일정 관리**](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-FE/wiki/%EC%9D%BC%EC%A0%95-%EA%B4%80%EB%A6%AC-%EC%84%9C%EB%B9%84%EC%8A%A4-%ED%99%94%EB%A9%B4)  | 전체 공정표, 공정계획, 작업지시, 공사일보, 공정 분석을 통해 현장 일정과 작업 흐름을 관리합니다. |
| [**투입 관리**](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-FE/wiki/%EC%9D%B8%EB%A0%A5-%EB%B0%B0%EC%B9%98-%EC%84%9C%EB%B9%84%EC%8A%A4-%ED%99%94%EB%A9%B4)  | 근무자 정보와 작업구역별 인력 배치 상태를 조회하고, 배치 확정 및 초기화를 통해 현장 인력 운영을 지원합니다. |
| [**현장 정보**](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-FE/wiki/%ED%98%84%EC%9E%A5-%EC%A0%95%EB%B3%B4-%EC%84%9C%EB%B9%84%EC%8A%A4-%ED%99%94%EB%A9%B4)  | 기상 관제와 장비 입출차 화면을 통해 당일 작업 위험 요소와 게이트별 중장비 투입 현황을 확인합니다. |
| [**문서 관리**](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-FE/wiki/%EB%AC%B8%EC%84%9C-%EA%B4%80%EB%A6%AC-%ED%99%94%EB%A9%B4)  | 공사 관련 문서 업로드와 공사일보 PDF 다운로드를 통해 현장 운영 자료를 관리합니다. |
| [**시스템 관리**](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-FE/wiki/%EC%8B%9C%EC%8A%A4%ED%85%9C-%EA%B4%80%EB%A6%AC%EC%9E%90-%EA%B6%8C%ED%95%9C-%E2%80%90-%ED%98%84%EC%9E%A5-%EA%B3%84%EC%A0%95-%EA%B4%80%EB%A6%AC-%ED%99%94%EB%A9%B4) | 본사 및 현장 사용자 계정, 권한, 신규 공사현장 정보를 관리합니다. |
| [**ESG 관리**](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-FE/wiki/ESG-%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C-%ED%99%94%EB%A9%B4) | 작업구역별 ESG 점수, 주간 미션, 환경 리스크, 현장 순위를 통해 현장 운영 상태를 요약합니다. |

```text
로그인 / 현장 선택
  ↓
공정계획 조회
  ↓
작업지시 등록 및 승인
  ↓
공사일보 작성 및 확인
  ↓
인력 배치 / 문서 관리 / 장비 입출차 / 기상 관제 / ESG 대시보드 연동
```

자세한 화면 설명, API 연동 흐름, 프론트엔드 구조, 트러블슈팅, 시연 자료는 [DnDn Wiki](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-FE/wiki)에서 확인할 수 있습니다.

</details>

---

<a id="05-실행-방법"></a>
<details>
<summary><h2>05. ▶️ 실행 방법</h2></summary>

DnDn Frontend는 Vite 기반 Vue.js 프로젝트입니다.  
로컬 환경에서 실행하기 위해서는 Node.js와 npm이 필요합니다.

### 1. 프로젝트 클론

```bash
git clone https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-FE.git
cd be24-fin-Intelli_J-DnDn-FE
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경 변수 설정

프로젝트 루트 경로에 `.env` 파일을 생성하고 백엔드 API 주소를 설정합니다.

```env
VITE_API_BASE_URL=http://localhost:8080
```

배포 환경에서는 운영 API 주소에 맞게 설정합니다.

```env
VITE_API_BASE_URL=https://api.dndn24.kro.kr
```

### 4. 개발 서버 실행

```bash
npm run dev
```

실행 후 브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:5173
```

### 5. 프로덕션 빌드

```bash
npm run build
```

### 6. 빌드 결과 미리보기

```bash
npm run preview
```

### 참고

- 프론트엔드는 백엔드 API 서버와 연동되어 동작합니다.
- 로그인, 작업지시, 공사일보, 인력 배치, 문서 관리, 기상 관제, 장비 입출차, ESG 대시보드 등 주요 화면은 백엔드 서버와 DB가 실행 중이어야 정상 조회됩니다.
- `.env` 파일은 민감 정보가 포함될 수 있으므로 Git에 커밋하지 않습니다.

</details>

---

<a id="06-무중단-배포-전략-bluegreen"></a>
<details>
<summary><h2>06. 🚀 무중단 배포 전략 (Blue/Green)</h2></summary>

건설 현장의 실시간 공정 관리 및 공사일보 작성을 지원하는 **DnDn** 서비스의 고가용성을 위해 **Blue/Green 무중단 배포** 방식을 적용했습니다.

새로운 기능 배포 중에도 현장 사용자가 작업지시, 공사일보, 인력 배치, 문서 관리, 장비 입출차, 기상 관제 화면을 계속 사용할 수 있도록 운영 슬롯과 신규 배포 슬롯을 분리하여 전환하는 구조를 사용했습니다.

<details>
<summary>🎬 무중단 배포 전환 테스트</summary>
<br/>

| 무중단 배포 전환 테스트 |
| :--- |
| <video src="https://github.com/user-attachments/assets/cce7ef7b-47be-46a5-b4a5-2defe1740e63" width="100%" controls></video> |

</details>

### 도입 배경

- **업무 연속성 보장:** 공사일보 작성, 작업지시 전달, 인력 배치 확인, 장비 입출차 관리 중 서비스가 중단되면 데이터 유실과 현장 혼선이 발생할 수 있습니다.
- **Zero Downtime:** 다수의 본사 및 현장 관계자가 실시간으로 접속하므로 배포를 위한 다운타임을 최소화해야 합니다.

### 동작 프로세스

1. 현재 운영 중인 슬롯이 실시간 트래픽을 처리합니다.
2. 새 버전의 애플리케이션을 비활성 슬롯에 배포합니다.
3. 신규 슬롯의 헬스체크가 성공하면 Service가 트래픽을 신규 슬롯으로 전환합니다.
4. 전환 완료 후 이전 슬롯은 스케일 다운하여 자원을 회수합니다.

### 검증 결과

- `curl` 명령어를 0.1초 간격으로 반복 호출하여 배포 중 응답 상태를 확인했습니다.
- 신규 버전 배포 및 전환 시점에도 서비스 중단 없이 정상 응답을 확인했습니다.

</details>

---

<a id="07-회고"></a>
<details>
<summary><h2>07. 💬 회고</h2></summary>

DnDn 프로젝트를 진행하면서 건설 현장의 공정, 작업지시, 공사일보, 인력 배치, 문서 관리, 장비 입출차, 기상 관제, ESG 관리가 서로 분리된 기능이 아니라 하나의 현장 운영 흐름으로 연결되어야 한다는 점을 경험했습니다.

각 팀원은 담당 기능을 구현하면서 B2B 서비스에서 중요한 업무 흐름, 데이터 연결성, 사용자 관점의 화면 구성, 운영 환경을 고려한 개발 경험을 쌓을 수 있었습니다.

<details>
<summary><strong>김민규</strong></summary>
<br/>

기상 관제, ESG 대시보드, 장비 입출차 기능을 구현하면서 단순히 데이터를 화면에 보여주는 것보다, 현장 관리자가 어떤 정보를 기준으로 판단해야 하는지 고민하는 과정이 중요하다는 것을 느꼈습니다.

작업지시 데이터를 중심으로 장비 투입 현황, 기상 정보, ESG 점수가 서로 연결되도록 구성하면서 B2B 서비스에서는 개별 기능보다 데이터 흐름과 업무 맥락이 중요하다는 점을 배웠습니다.

또한 Redis 분산락, 스케줄러, 외부 API 연동, 대시보드 반응형 UI를 함께 다루며 실제 운영 환경을 고려한 프론트엔드 개발 경험을 쌓을 수 있었습니다.

</details>

<details>
<summary><strong>이한별</strong></summary>
<br/>

작성 예정

</details>

<details>
<summary><strong>전민주</strong></summary>
<br/>

작성 예정

</details>

<details>
<summary><strong>전성훈</strong></summary>
<br/>

작성 예정

</details>

<details>
<summary><strong>최승우</strong></summary>
<br/>

작성 예정

</details>

</details>
