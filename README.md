# DnDn - 담당 기능 정리
> 건설 현장 운영 데이터를 연결하는 통합 관리 플랫폼  

## 프로젝트 링크

- **서비스**: [DnDn](https://www.dndn26.kro.kr)
- **API 명세서**: [Swagger UI](https://1jshun.github.io/DnDn-Architecture/)
- **기술 문서**: [DnDn Wiki](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-BE/wiki)
- **구현 소스 코드**: [GitHub Repository](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-BE)
- **Blue-Green 배포 전환 시연**: [영상 보기](https://github.com/user-attachments/assets/9a31362a-4578-4c3a-af02-114a7b628da8)

## 핵심 성과

1. **Kubernetes 기반 MSA 배포 환경 구성**
   - 기존 핵심 업무 서비스와 문서 관리 서비스를 독립적으로 배포하고, API Gateway·서비스 디스커버리를 통해 서비스 간 요청 흐름을 구성
   - Nginx Ingress에서 일반 API와 문서 관리 API의 진입 경로를 분리해 장애 영향 범위를 축소

2. **Jenkins 기반 CI/CD 및 Blue-Green 배포**
   - 서비스별 Jenkins 파이프라인을 분리하고, 변경된 서비스만 이미지 빌드·레지스트리 푸시·Kubernetes 배포가 진행되도록 구성
   - 새 버전의 정상 기동을 확인한 뒤 트래픽을 전환하고, 배포 실패 시 기존 버전을 유지할 수 있는 배포 흐름 구축

3. **문서 관리 고도화**
   - 문서 조회 로직이 기존 핵심 업무 서비스의 처리 자원을 점유하는 문제를 부하 테스트와 JVM 모니터링으로 확인하고, 문서 관리 기능을 별도 서비스로 분리
   - Kafka 이벤트 기반으로 원본 데이터 저장과 문서 목록·미리보기 갱신을 비동기 처리하고, Elasticsearch 기반 검색 구조를 구성
   - 문서 조회 평균 응답 시간 `9,318.28ms → 223.69ms`, 검색 평균 응답 시간 `1,265.43ms → 129.98ms` 개선

## 운영 및 모니터링

**운영 기간** · 2026.05.11 – 2026.06.04

Docker·Kubernetes 기반 배포 환경에서 서비스와 API 엔드포인트의 상태를 운영 기간 동안 모니터링했습니다.  
Grafana HTTP Probe 지표를 통해 응답 상태와 성공률을 확인하고, 배포 이후 서비스 상태를 점검했습니다.

<table>
  <tr>
    <td align="center">
      <img width="400" alt="서비스 및 API 상태 모니터링" src="https://github.com/user-attachments/assets/66ac3c9e-95c5-4811-a89b-7c77fb512fb4" />
      <br />
      <sub>서비스·API 상태 모니터링</sub>
    </td>
    <td align="center">
      <img width="400" alt="JVM 리소스 모니터링" src="https://github.com/user-attachments/assets/176e00f4-272d-4613-be25-08baa22a2915" />
      <br />
      <sub>JVM 리소스 및 요청 처리 상태</sub>
    </td>
  </tr>
</table>

## 기술 스택

`Java` `Spring Boot` `JPA` `MariaDB` `Kafka` `Elasticsearch`  
`Spring Cloud Gateway` `Eureka` `Docker` `Kubernetes` `Nginx Ingress` `Jenkins` `Kaniko`


## 시스템 아키텍처

<img width="959" height="993" alt="imaasdge" src="https://github.com/user-attachments/assets/8da5c9a5-f17f-425b-9f92-1df84e92c927" />

<br/>

---

## 1. Kubernetes 기반 MSA 배포 환경 구성

핵심 업무 서비스와 문서 관리 서비스를 독립적으로 배포하고, API Gateway와 서비스 디스커버리를 통해 서비스 간 요청 흐름을 구성했습니다.

### 배포 구성

- 핵심 업무 서비스와 문서 관리 서비스는 Blue-Green 방식으로 배포
- API Gateway와 서비스 디스커버리 서버는 RollingUpdate 방식으로 배포
- Kubernetes Deployment와 Service를 분리해 서비스별 배포·트래픽 관리
- Nginx Ingress를 외부 트래픽의 단일 진입점으로 구성

### 요청 라우팅 구조

```text
일반 API 요청
Client → Nginx Ingress → 핵심 업무 서비스

문서 관리 API 요청
Client → Nginx Ingress → API Gateway → 서비스 디스커버리 → 문서 관리 서비스
```

### 구성 의도

일반 업무 API와 문서 관리 API의 진입 경로를 분리했습니다.  
문서 관리 서비스나 Gateway에 문제가 발생하더라도 로그인, 프로젝트 관리 등 핵심 업무 API의 영향 범위를 줄이고자 했습니다.

---

## 2. Jenkins 기반 CI/CD 및 Blue-Green 배포

핵심 업무 서비스와 문서 관리 서비스의 Jenkins 파이프라인을 분리하고, 변경된 서비스만 빌드·배포되도록 구성했습니다.

### 주요 구현 내용

- GitHub Webhook으로 Jenkins 파이프라인 실행
- 변경 파일 경로를 확인해 관련 서비스만 빌드·배포
- Kaniko로 컨테이너 이미지 빌드 후 Docker Hub에 Push
- 비활성 Blue 또는 Green Deployment에 새 이미지 배포
- `rollout status`로 Pod의 정상 기동 여부 확인
- Kubernetes Service selector 전환으로 트래픽 전환

### 배포 흐름

```text
GitHub Webhook
  ↓
변경된 서비스 확인
  ↓
Kaniko 이미지 빌드 및 Docker Hub Push
  ↓
비활성 Deployment에 새 버전 배포
  ↓
rollout status로 정상 기동 확인
  ↓
Service selector 전환
  ↓
이전 버전 replica 축소
```

### 구성 의도

새 버전을 기존 Pod에 바로 반영하지 않고, 비활성 환경에서 먼저 정상 기동 여부를 확인하도록 구성했습니다.  
readiness를 통과하지 못하면 트래픽을 전환하지 않아 기존 활성 버전을 유지할 수 있으며, 서비스별 파이프라인 분리로 배포 실패 시 영향 범위와 재실행 범위를 줄였습니다.

---

## 3. 문서 관리 고도화

여러 업무 도메인에서 생성되는 문서를 하나의 목록과 검색 화면에서 제공하기 위해, 문서 관리 기능을 별도 서비스로 분리하고 비동기 데이터 처리·검색 구조를 구성했습니다.

### 문제 분석

기존에는 문서 조회 로직이 핵심 업무 서비스 내부에서 실행되어, 문서 조회 부하가 다른 업무 API와 Thread·DB Connection·JVM 메모리를 함께 점유했습니다.

- `198 users` 부하에서 평균 응답 시간 `9,318.28ms`, 오류 `590건` 발생
- Grafana JVM 지표에서 Live Thread가 약 `100 → 275`까지 증가

### 문서 관리 서비스 분리

```text
핵심 업무 서비스
  └─ 원본 업무 데이터 저장
      ↓ Kafka 이벤트 발행
문서 관리 서비스
  └─ 문서 목록·미리보기 데이터 갱신
```

- Strangler Pattern으로 문서 관리 기능부터 점진적으로 분리
- 원본 업무 데이터는 핵심 업무 서비스가 관리하고, 문서 목록·미리보기 데이터는 문서 관리 서비스가 관리
- Kafka 이벤트 기반 비동기 처리로 원본 데이터 저장 흐름과 문서 조회용 데이터 갱신을 분리
- API Gateway와 서비스 디스커버리로 문서 관리 서비스의 내부 위치를 숨기고 요청을 라우팅

### Elasticsearch 기반 문서 검색 고도화

RDBMS의 다중 조건·키워드 검색 한계를 개선하기 위해 Elasticsearch 기반 전문 검색 구조를 구성했습니다.

```text
MariaDB 저장
  ↓
Logstash 증분 동기화
  ↓
Elasticsearch 색인
  ↓
문서 검색 API
```

- 파일명, 문서 유형, 공종, 날짜, 본문 텍스트를 통합 검색
- Nori 형태소 분석기, 사용자 사전, 동의어 필터를 적용해 건설 도메인 용어 검색 정확도 개선
- RDBMS를 원본 데이터로 유지하고, Logstash로 `updated_at` 기준 증분 색인
- Elasticsearch 장애 시 RDBMS 검색으로 fallback하는 구조 구성

### 개선 결과

| 항목 | 개선 전 | 개선 후 |
|:---|---:|---:|
| 문서 조회 평균 응답 시간 | 9,318.28ms | 223.69ms |
| 문서 조회 오류 | 590건 | 0건 |
| 검색 TPS | 62.2 | 219.5 |
| 검색 평균 응답 시간 | 1,265.43ms | 129.98ms |

---

## 4. 일정 관리 API 설계 및 구현

건설 현장의 공정 흐름을 관리하기 위해 최초 공정표부터 세부 작업 계획, 일정 변경 요청, 공정 분석까지 이어지는 API를 설계하고 구현했습니다.

### 주요 구현 내용

- 최초 공정표 등록·조회·수정·삭제 API 구현
- 공종 및 공정 단위 일정 관리 API 구현
- 세부 작업 계획 등록·일괄 등록·조회·수정·삭제 API 구현
- 연간·월간 계획서 업로드 후 JSON 파싱 기반 일정 추출 흐름 구성
- 일정 변경 요청 생성·승인·반려·반영 프로세스 구현
- 계획 대비 실제 진행률과 지연 위험 작업 분석 API 구현

### 주요 API

| 구분 | API |
|:---|:---|
| 최초 공정표 | `/master-schedule` |
| 공종·공정 | `/trade-process` |
| 세부 작업 계획 | `/work-plan` |
| 일정 변경 요청 | `/schedule-change-request` |
| 공정 분석 | `/analysis/progress`, `/analysis/delay-risk-tasks` |

### 구현 의도

단순 CRUD가 아니라 최초 공정표에서 세부 작업 계획, 일정 변경, 공정 분석으로 이어지는 업무 흐름을 기준으로 API를 구성했습니다.  
현장 관리자가 전체 공정과 세부 일정을 함께 확인하고, 변경 요청과 지연 위험을 바탕으로 의사결정할 수 있도록 설계했습니다.

