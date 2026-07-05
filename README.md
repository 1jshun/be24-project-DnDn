# DnDn - 담당 기능 정리

> 건설 현장 운영 데이터를 연결하는 통합 관리 플랫폼  

<br/>

## 바로가기

- **Service** : [DnDn](https://www.dndn24.kro.kr)
- **API Docs** : [DndnCore API](https://1jshun.github.io/DnDn-Architecture/)
- **Wiki** : [DnDn Backend Wiki](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-BE/wiki)
- **Backend Repository** : [be24-fin-Intelli_J-DnDn-BE](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-BE)

<br/>

## 담당 역할

- 일정 관리 API 설계 및 구현
- 문서관리 기능 MSA 분리
- Elasticsearch 기반 검색 기능 개선
- Kubernetes 기반 배포 환경 구성

<br/>

## 기술 스택

`Java` `Spring Boot` `JPA` `MariaDB` `Kafka` `Elasticsearch`  
`Spring Cloud Gateway` `Eureka` `Docker` `Kubernetes` `Nginx Ingress` `Jenkins` `Kaniko`

<br/>

## 1. 일정 관리 API 설계 및 구현

건설 현장의 공정 흐름을 관리하기 위해 최초 공정표, 공종, 세부 작업 계획, 일정 변경 요청, 공정 분석 API를 설계하고 구현했습니다.

### 주요 구현 내용

- 최초 공정표 등록, 조회, 수정, 삭제 API 구현
- 공종 및 공정 단위의 일정 관리 API 구현
- 세부 작업 계획 등록, 일괄 등록, 조회, 수정, 삭제 API 구현
- 연간/월간 계획서 업로드 후 JSON 파싱 기반 일정 추출 흐름 구성
- 일정 변경 요청 생성, 승인, 반려, 반영 프로세스 구현
- 계획 대비 실제 진행률과 지연 위험 작업을 조회하는 분석 API 구현

### 주요 API

| 구분 | API |
|:---|:---|
| 최초 공정표 | `/master-schedule` |
| 공종/공정 | `/trade-process` |
| 세부 작업 계획 | `/work-plan` |
| 일정 변경 요청 | `/schedule-change-request` |
| 공정 분석 | `/analysis/progress`, `/analysis/delay-risk-tasks` |

### 구현 의도

단순 일정 CRUD가 아니라, 최초 공정표에서 세부 작업 계획으로 이어지는 흐름을 기준으로 API를 구성했습니다.  
이를 통해 현장 관리자는 전체 공정 흐름과 세부 작업 일정을 함께 확인하고, 변경 요청과 지연 위험을 기준으로 일정 관리 의사결정을 할 수 있습니다.

<br/>

## 2. 문서관리 기능 MSA 분리

문서 조회 부하가 Core API의 요청 처리 자원을 점유하는 문제를 줄이기 위해 문서관리 기능을 별도 서비스로 분리했습니다.

### 분리 구조

```text
dndn-core
  └─ 작업 지시, 공사 일보, 공정표 등 원본 데이터 저장
      ↓ Kafka Event
dndn-document-management
  └─ 문서 목록, 미리보기, 검색 인덱스 갱신
```

### 주요 구현 내용

- 기존 Core API에서 문서관리 책임 분리
- `dndn-document-management` 서비스 구성
- `dndn-gateway`를 통한 MSA 요청 라우팅 구성
- `Eureka` 기반 서비스 디스커버리 구조 적용
- Core 데이터 변경 시 Kafka 이벤트 발행
- Document Management 서비스에서 이벤트 소비 후 문서 조회용 데이터 갱신

### 요청 라우팅 구조

```text
/        → frontend-service
/api     → backend-service
/api/msa → gateway-service → dndn-document-management
```

### 구현 의도

Core API는 로그인, 프로젝트, 공정, 작업 지시 등 핵심 흐름을 유지하고, 문서관리는 별도 서비스에서 처리하도록 분리했습니다.  
이를 통해 문서 조회 부하나 문서관리 서비스 장애가 발생해도 Core API의 주요 업무 흐름에 미치는 영향을 줄일 수 있도록 설계했습니다.

<br/>

## 3. Elasticsearch 기반 검색 기능 개선

기존 RDBMS 기반 검색은 다중 조건 검색과 `LIKE` 기반 키워드 검색에서 성능 한계가 있었습니다.  
이를 개선하기 위해 문서 검색 구조를 Elasticsearch 기반으로 전환했습니다.

### 주요 구현 내용

- 문서 검색용 인덱스 구조 설계
- 공정표, 작업 지시서, 공사 일보 등 문서성 데이터 통합 검색 구성
- 파일명, 문서 유형, 공종, 날짜, 본문 텍스트 기준 검색 지원
- Elasticsearch 장애 시 RDB 검색으로 fallback하는 구조 구성
- Kafka 이벤트 기반 문서 변경 흐름과 검색 인덱스 갱신 흐름 연결

### 개선 효과

| 항목 | 개선 전 | 개선 후 |
|:---|---:|---:|
| TPS | 62.2 | 219.5 |
| Peak TPS | 87 | 290 |
| 평균 응답시간 | 1,265.43ms | 129.98ms |
| 전체 요청 | 6,966 | 25,038 |
| 오류 | 0 | 0 |

### 구현 의도

문서 검색은 단순 DB 조회보다 검색 조건과 본문 탐색 범위가 넓기 때문에, 조회 목적에 맞는 검색 전용 구조가 필요했습니다.  
Elasticsearch를 적용해 문서 본문과 메타데이터를 함께 검색할 수 있도록 구성했고, 검색 응답시간을 줄이면서도 장애 상황에서는 RDB fallback으로 안정성을 확보했습니다.

<br/>

## 4. Kubernetes 기반 배포 환경 구성

백엔드 서비스와 문서관리 MSA를 Kubernetes 환경에서 독립적으로 배포할 수 있도록 배포 구조를 구성했습니다.

### 주요 구현 내용

- `dndn-core`, `dndn-document-management`, `dndn-gateway`, `dndn-discovery` 서비스 분리 배포
- Nginx Ingress 기반 path routing 구성
- Jenkins Job을 서비스별로 분리
- Kaniko 기반 Docker 이미지 빌드 및 Docker Hub Push 구성
- Core Backend와 Document Management에 Blue-Green 배포 구조 적용
- Kubernetes Service selector 전환 방식으로 트래픽 전환 구성

### Blue-Green 배포 흐름

```text
Jenkins 빌드 시작
  ↓
Kaniko 이미지 빌드
  ↓
Docker Hub Push
  ↓
Inactive Deployment에 새 이미지 반영
  ↓
rollout status 확인
  ↓
Service selector 전환
  ↓
이전 Deployment replicas 축소
```

### 구현 의도

새 버전을 기존 Pod에 바로 덮어쓰지 않고 inactive 환경에 먼저 배포한 뒤, 정상 기동 여부를 확인하고 트래픽을 전환하도록 구성했습니다.  
이를 통해 배포 실패 시 기존 active 버전을 유지할 수 있고, 서비스별로 빌드와 배포 범위를 분리해 장애 영향 범위를 줄였습니다.

<br/>

## 성과 요약

- 일정 관리 API를 통해 최초 공정표, 세부 작업 계획, 일정 변경, 공정 분석 흐름 구현
- 문서관리 기능을 MSA로 분리하여 Core API와 문서 조회 부하 분리
- Kafka 기반 비동기 이벤트로 Core 저장 흐름과 문서 인덱싱 흐름 분리
- Elasticsearch 기반 검색 구조로 문서 검색 성능 개선
- Kubernetes, Ingress, Jenkins, Kaniko 기반 배포 환경 구성
- Blue-Green 배포 구조를 통해 트래픽 전환과 롤백 가능한 배포 흐름 확보

