# DnDn

> 건설 현장 운영 데이터와 업무 프로세스를 연결하는 통합 관리 플랫폼

## 프로젝트 링크

- 서비스: [DnDn](https://www.dndn26.kro.kr)
- API 명세: [Swagger UI](https://1jshun.github.io/DnDn-Architecture/)
- 기술 문서: [DnDn Wiki](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-BE/wiki)
- 소스 코드: [GitHub Repository](https://github.com/beyond-sw-camp/be24-fin-Intelli_J-DnDn-BE)
- Blue-Green 배포 전환: [영상 보기](https://github.com/user-attachments/assets/9a31362a-4578-4c3a-af02-114a7b628da8)

---

<a id="operations-monitoring"></a>
## 운영 및 모니터링

**운영 기간:** 2026.05.11 ~ 2026.06.04

운영 기간 동안 Grafana HTTP Probe로 서비스 API와 로드밸런서의 응답 상태 및 성공률을 모니터링했습니다. JVM 지표를 통해 배포 후 서비스 상태와 자원 사용량도 함께 점검했습니다.

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

---

<a id="system-architecture"></a>
## 시스템 아키텍처

<img width="959" height="993" alt="DnDn 시스템 아키텍처" src="https://github.com/user-attachments/assets/8da5c9a5-f17f-425b-9f92-1df84e92c927" />

기존 모놀리식 서비스와 문서 관리 MSA가 공존하는 점진적 MSA 전환 구조를 구성했습니다. 문서 관리 기능을 분리해 서비스별 배포·확장·장애 범위를 나누고, 외부 요청은 Nginx Ingress로 수신합니다. 문서 관리 API는 API Gateway와 Eureka를 통해 라우팅하며, 원본 데이터 변경은 Kafka 이벤트로 전달해 문서 목록과 미리보기 데이터를 비동기로 갱신합니다.

---

<a id="toc"></a>
## 담당 역할 및 구현 내용

- [1. 컨테이너 인프라 및 배포 환경 구성](#container-infrastructure)
  - [컨테이너 이미지 구성](#container-image-management)
  - [Kubernetes 클러스터 구성 및 운영](#kubernetes-cluster-operations)
  - [Kubernetes 워크로드 구성](#kubernetes-workloads)
  - [Ingress 기반 요청 경로 분리](#ingress-routing)
- [2. Jenkins CI/CD 및 Blue-Green 배포](#cicd-blue-green)
  - [Kubernetes Pod Agent와 서비스별 Pipeline](#pipeline-separation)
  - [변경 서비스만 배포하는 흐름](#selective-deployment)
  - [Blue-Green 적용 및 트래픽 전환](#traffic-switch-and-rollback)
- [3. 문서 관리 서비스 고도화](#document-service)
  - [문제 발견: 부하 테스트와 JVM 모니터링](#performance-bottleneck)
  - [문서 관리 서비스 분리](#document-service-extraction)
  - [Kafka 기반 비동기 데이터 갱신](#kafka-async-update)
  - [Elasticsearch 기반 문서 검색](#elasticsearch-search)
  - [개선 결과](#performance-results)

---

<a id="container-infrastructure"></a>
## 1. 컨테이너 인프라 및 배포 환경 구성

<a id="container-image-management"></a>
### 컨테이너 이미지 구성

모놀리식 서비스·문서 관리 MSA·Gateway·Discovery 서비스를 서비스별 Dockerfile로 분리해 이미지화했습니다. 각 Dockerfile은 Gradle 빌드 단계와 실행 단계를 분리한 멀티 스테이지 빌드로 구성해, 빌드 산출물인 Spring Boot JAR만 실행 이미지에 포함했습니다.

<table>
  <tr>
    <td align="center">
      <img width="435" height="316" alt="Image" src="https://github.com/user-attachments/assets/04e54128-669c-4c18-8f0f-8d0e0ca25412" />
      <br />
    </td>
    <td align="center">
      <img width="435" height="316" alt="image" src="https://github.com/user-attachments/assets/c216f74d-660e-40e8-a6d6-44ec2b090a6d" />
      <br />
    </td>
  </tr>
</table>

- Gradle 의존성을 소스 코드보다 먼저 내려받아 의존성 레이어 캐시 활용
- 서비스별 포트와 실행 JAR를 포함한 독립 이미지 생성
- 빌드한 이미지를 Docker Hub에 push하고 Kubernetes Deployment의 실행 이미지로 지정

```text
Source Code → Docker Image Build → Docker Hub Push → Kubernetes Deployment → Pod 실행
```

<a id="kubernetes-cluster-operations"></a>
### Kubernetes 클러스터 구성 및 운영

Kubernetes 클러스터를 1대의 제어 노드와 6대의 작업 노드로 역할 분리해 구성했습니다. 애플리케이션 Pod는 작업 노드에서 실행되도록 운영했으며, 서비스 운영 용량을 확보하기 위해 작업 노드에 가상 디스크를 추가했습니다.

<img width="434" height="201" alt="Image" src="https://github.com/user-attachments/assets/422e0cf2-8f8a-46ec-bd99-008a40484b8d" />

Helm Chart를 활용해 Grafana, Kiali, Strimzi Kafka Operator, Longhorn, ECK 등 Kubernetes 운영 컴포넌트를 설치했습니다. 또한 Istio 서비스 메시를 적용해 서비스 간 통신을 관측했습니다.

| 운영 영역 | 구성 컴포넌트 | 활용 목적 |
|:---|:---|:---|
| 모니터링 | Prometheus, Grafana | 서비스·JVM 지표 수집 및 시각화 |
| 서비스 메시 | Istio, Kiali | 서비스 간 트래픽과 배포 버전별 연결 상태 시각화 |
| 이벤트 메시징 | Strimzi Kafka Operator | Kafka 클러스터 운영 |
| 문서 검색 | ECK Operator 기반 Elasticsearch, Logstash, Kibana | 문서 통합 검색 성능 개선 |
| 영구 스토리지 | Longhorn | Kubernetes 볼륨의 영구 저장소 관리 |

<a id="kubernetes-workloads"></a>
### Kubernetes 워크로드 구성

문서 관리 기능을 모놀리식 서비스에서 분리해, 각 서비스가 별도의 Deployment와 Service로 배포·확장되도록 구성했습니다.

| 서비스 | 담당 기능 | Kubernetes 구성 |
|:---|:---|:---|
| 모놀리식 서비스 | 로그인, 프로젝트 관리 등 일반 업무 API 및 원본 데이터 관리 | `backend Deployment` + `backend Service` |
| 문서 관리 MSA | 문서 목록, 미리보기, 문서 검색 | `document-management Deployment` + `document-management Service` |

- 문서 관리 MSA의 부하·배포·장애가 모놀리식 서비스에 직접 영향을 주지 않도록 서비스 경계와 실행 환경을 분리
- 모놀리식 서비스와 문서 관리 MSA를 각각 Deployment와 ClusterIP Service로 구성해 독립 배포·내부 통신
- Deployment에 `startupProbe`·`readinessProbe`·`livenessProbe`를 설정해 기동 완료, 트래픽 수신 가능 상태, 비정상 Pod 재시작을 관리
- CPU·메모리 requests와 limits를 설정해 Pod의 최소 보장 자원과 최대 사용량을 지정
- 환경 변수는 ConfigMap으로 주입하고, 문서 관리 MSA의 Elasticsearch 인증서는 Secret 볼륨으로 마운트
- Service selector로 활성 Pod를 지정해 고정된 내부 접근 지점을 제공하고, 배포 시 트래픽 전환에 활용

<a id="ingress-routing"></a>
### Ingress 기반 요청 경로 분리

| 요청 유형 | 요청 경로 | 처리 흐름 |
|:---|:---|:---|
| 모놀리식 서비스 API | `/api` | Nginx Ingress → 모놀리식 Service → 모놀리식 Pod |
| 문서 관리 API | `/api/msa` | Nginx Ingress → API Gateway → Eureka → 문서 관리 MSA Service → 문서 관리 MSA Pod |

Nginx Ingress는 외부 트래픽 수신, TLS Secret을 통한 HTTPS 적용, 경로 기반 요청 분기를 담당했습니다. 모놀리식 서비스는 직접 라우팅해 불필요한 중간 홉과 Gateway 의존성을 줄였고, 분리한 문서 관리 MSA에만 Gateway를 적용해 내부 위치 은닉과 Eureka 기반 서비스 탐색·라우팅을 맡겼습니다.

```text
Client
  └─ Nginx Ingress
       ├─ /api      → backend-service
       └─ /api/msa  → gateway-service → Eureka → document-management-service
```

<img width="859" height="452" alt="image" src="https://github.com/user-attachments/assets/ab4e1203-3239-460b-9cff-6fa98c73dc0e" />

[목차로 돌아가기](#toc)

---

<a id="cicd-blue-green"></a>
## 2. Jenkins CI/CD 및 Blue-Green 배포

<a id="pipeline-separation"></a>
### Kubernetes Pod Agent와 서비스별 Pipeline

Jenkins Pipeline은 Kubernetes Pod Agent에서 실행되도록 구성했습니다. 파이프라인 실행마다 Gradle·Kaniko·kubectl 컨테이너를 포함한 Agent Pod를 생성해 빌드와 배포를 수행합니다.

- Gradle 컨테이너에서 서비스별 Spring Boot JAR 빌드
- Kaniko 컨테이너에서 Docker daemon 없이 이미지 빌드·Docker Hub Push
- Docker Hub 인증 정보는 Kubernetes Secret으로 마운트
- kubectl 컨테이너에서 Kubernetes 리소스 배포 및 상태 확인
- 모놀리식 서비스·문서 관리 MSA·Gateway의 Pipeline을 분리해, 한 서비스의 배포 실패가 다른 서비스의 배포를 막지 않도록 구성

#### 서비스별 CI/CD 분리 이유

| 설계 | 목적 |
|:---|:---|
| 서비스별 Jenkins Pipeline 분리 | 한 서비스의 빌드·배포 실패가 다른 서비스의 배포를 중단시키지 않도록 영향 범위 격리 |
| 변경 파일 경로 기반 실행 | 변경된 서비스만 빌드·이미지 Push·배포해 불필요한 전체 빌드와 배포 방지 |

<a id="selective-deployment"></a>
### 변경 서비스만 배포하는 흐름

```text
GitHub Webhook
  ↓
변경 파일 경로 분석
  ↓
변경된 서비스의 Jenkins Pipeline 실행
  ↓
Gradle JAR 빌드
  ↓
Kaniko 이미지 빌드 및 Docker Hub Push
  ↓
비활성(Blue 또는 Green) Deployment에 새 이미지 배포
```

- 변경된 서비스의 파일 경로를 확인해 해당 서비스만 빌드·푸시·배포
- Kaniko를 사용해 Docker daemon 없이 컨테이너 이미지를 빌드
- 빌드된 이미지는 Docker Hub에 푸시한 뒤 Kubernetes Deployment에서 사용

<a id="traffic-switch-and-rollback"></a>
### Blue-Green 적용 및 트래픽 전환

모놀리식 서비스와 문서 관리 MSA에는 Blue-Green 배포를 적용하고, Gateway와 discovery는 RollingUpdate 방식으로 운영했습니다.

#### Blue-Green 선택 이유

| 대상 | 선택 이유 |
|:---|:---|
| 기존 모놀리식 서비스 | 로그인, 인증, 프로젝트 관리 등 사용자 흐름의 중심 API입니다. 새 버전의 정상 기동을 확인하기 전에 기존 버전을 축소하면 서비스 전반에 영향이 발생할 수 있어, 비활성 환경에서 먼저 검증한 뒤 트래픽을 전환하도록 구성했습니다. |
| 문서 관리 MSA | MariaDB, Kafka, Elasticsearch, S3, Eureka 등 외부 의존성이 많아 환경 변수·Secret·연결 설정 문제의 영향을 받을 수 있습니다. 기존 Pod에 바로 반영하지 않고 비활성 환경에서 정상 동작을 확인한 뒤 트래픽을 전환하기 위해 Blue-Green 방식을 적용했습니다. |

#### 배포 및 트래픽 전환 흐름

```text
GitHub Push
  ↓
GitHub Webhook
  ↓
Jenkins Pipeline 실행
  ↓
변경 파일 경로 분석
  ↓
변경된 서비스만 Gradle JAR 빌드
  ↓
Kaniko 이미지 빌드 및 Docker Hub Push
  ↓
Service selector로 현재 활성 색상 확인
  ↓
비활성 Deployment에 새 이미지 적용 및 replica 확장
  ↓
rollout status 대기
  ↓
Kubernetes Service selector를 새 버전으로 전환
  ↓
이전 Deployment replica를 0으로 축소
```

<img width="982" height="285" alt="Image" src="https://github.com/user-attachments/assets/f1634490-cbd4-4eb9-b056-fa74f9646bb5" />

Service selector로 현재 활성 색상을 확인한 뒤, 비활성 환경에 새 이미지를 배포하고 replica를 확장합니다. `rollout status`로 Pod의 정상 기동을 확인한 경우에만 selector를 전환합니다. 검증에 실패하면 selector를 변경하지 않으므로 기존 활성 버전이 트래픽을 계속 처리합니다.

[목차로 돌아가기](#toc)

---

<a id="document-service"></a>
## 3. 문서 관리 서비스 고도화

<a id="performance-bottleneck"></a>
### 문제 발견: 부하 테스트와 JVM 모니터링

기존에는 문서 조회 로직이 핵심 업무 서비스 내부에서 실행됐습니다. 문서 조회 부하가 증가하면서 일반 업무 API도 동일한 Thread·DB Connection·JVM 메모리를 함께 사용했고, 핵심 서비스의 처리 자원을 점유하는 병목이 발생했습니다.

- `198 users` 부하에서 문서 조회 평균 응답 시간 `9,318.28ms`, 오류 `590건` 발생
- Grafana JVM 지표에서 Live Thread가 약 `100 → 275`까지 증가

<a id="document-service-extraction"></a>
### 문서 관리 서비스 분리

문서 관리 기능은 Strangler Pattern을 적용해 별도 서비스로 점진적으로 분리했습니다.

| 데이터/기능 | 담당 서비스 |
|:---|:---|
| 원본 업무 데이터 | 핵심 업무 서비스 |
| 문서 목록·미리보기 데이터 | 문서 관리 서비스 |
| 문서 조회·검색 API | 문서 관리 서비스 |

핵심 업무 서비스는 원본 데이터의 소유권을 유지하고, 문서 관리 서비스는 조회에 최적화된 문서 데이터를 관리하도록 역할을 분리했습니다.

<a id="kafka-async-update"></a>
### Kafka 기반 비동기 데이터 갱신

```text
핵심 업무 서비스
  └─ 원본 업무 데이터 변경 → Kafka 이벤트 발행
                                 ↓
                         문서 관리 서비스 소비
                                 ↓
                 문서 목록·미리보기 데이터 비동기 갱신
```

- 원본 데이터 저장과 문서용 데이터 갱신을 Kafka 이벤트로 분리
- 문서 목록·미리보기 갱신을 비동기 처리해 핵심 업무 요청의 처리 부담 감소
- 데이터 변경 이벤트를 기준으로 문서 서비스의 조회용 데이터를 최신화

<a id="elasticsearch-search"></a>
### Elasticsearch 기반 문서 검색

```text
MariaDB 원본 데이터
  ↓
Logstash 증분 동기화 (updated_at 기준)
  ↓
Elasticsearch 인덱스
  ↓
문서 검색 API
```

- 파일명, 문서 유형, 공종, 작성일, 본문 텍스트를 대상으로 통합 검색 제공
- Nori 형태소 분석기와 사전·동의어 필터를 적용해 건설 도메인 용어 검색 정확도 개선
- RDBMS를 원본 데이터로 유지하고 `updated_at` 기준 Logstash 증분 동기화 구성
- Kibana로 색인된 문서 데이터와 검색 결과를 검증
- Elasticsearch 장애 시 RDBMS 검색으로 fallback하도록 구성

<a id="performance-results"></a>
### 개선 결과

| 항목 | 개선 전 | 개선 후 |
|:---|---:|---:|
| 문서 조회 평균 응답 시간 | 9,318.28ms | 223.69ms |
| 문서 조회 오류 | 590건 | 0건 |
| 검색 TPS | 62.2 | 219.5 |
| 검색 평균 응답 시간 | 1,265.43ms | 129.98ms |

[목차로 돌아가기](#toc)
