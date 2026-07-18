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

<img width="767" height="794" alt="DnDn 시스템 아키텍처" src="https://github.com/user-attachments/assets/8da5c9a5-f17f-425b-9f92-1df84e92c927" />

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
- [3. 문서 관리 MSA 고도화](#document-service)
  - [문제 발견: 부하 테스트와 JVM 모니터링](#performance-bottleneck)
  - [문서 관리 MSA 분리](#document-service-extraction)
  - [Kafka 기반 비동기 데이터 갱신](#kafka-async-update)
  - [ECK 기반 Elasticsearch 문서 검색](#elasticsearch-search)
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
## 3. 문서 관리 기능 고도화

<a id="performance-bottleneck"></a>
### 문제 발견: 부하 테스트와 JVM 모니터링

기존에는 문서 조회 기능이 모놀리식 서비스 내부에서 일반 업무 API와 함께 실행됐습니다. 
문서 조회 요청이 증가하면서 Thread, DB Connection, JVM 메모리 등 동일한 처리 자원을 경쟁적으로 사용했고, 그 영향으로 일반 업무 API의 응답 성능까지 저하되는 병목이 발생했습니다.

<img width="784" height="263" alt="Image" src="https://github.com/user-attachments/assets/20150ca9-f9ee-4bd1-8908-6712a5b05668" />
<img width="777" height="182" alt="Image" src="https://github.com/user-attachments/assets/c23fee53-4905-4c9b-8e8e-805498ede15f" />

- 기존 모놀리식의 핵심 API는 200 users 기준 TPS 64.0, Mean Test Time 461.53ms, Error 0건을 기록으로 안정적 응답 확인

<img width="778" height="260" alt="Image" src="https://github.com/user-attachments/assets/7a4a4802-e24a-4b88-bbdd-181175f39239" />
<img width="795" height="187" alt="Image" src="https://github.com/user-attachments/assets/ce8eb948-57a9-4d1e-b5c8-6c904aa63ca6" />
<img width="550" height="294" alt="Core JVM Thread 및 GC 지표 변화" src="https://github.com/user-attachments/assets/85cc1078-8307-439a-a162-1e3a6a5debe1" />

- 문서 조회 기능 `30 users` 부하에서 평균 응답 시간 `9,318.28ms`, 오류 `590건` 발생
- Grafana JVM 지표에서 Live Thread가 약 `100 → 275`까지 증가

<a id="document-service-extraction"></a>
### 문서 관리 MSA 분리

문서 관리 기능을 MSA로 분리하고, Gateway 라우팅을 통해 문서 관리 API 요청이 문서 관리 MSA로 전달되도록 구성했습니다.

1. **점진적 분리**  
   Strangler Pattern을 적용해 기존 API 구조를 유지하면서, 분리 가능한 문서 관리 기능부터 문서 관리 MSA로 단계적으로 이관했습니다.

2. **서비스 책임 분리**  
   모놀리식 서비스는 원본 업무 데이터 처리와 소유권을 유지하고, 문서 관리 MSA는 문서 목록·미리보기·검색을 위한 조회용 데이터를 담당하도록 역할을 분리했습니다.

3. **요청 경로 분리**  
   기존 API 요청은 모놀리식 서비스에서 처리하도록 유지하고, 문서 관리 API 요청만 `/api/msa/**` 경로로 분리했습니다.

4. **Gateway 라우팅 적용**  
   `/api/msa/**` 요청은 Spring Cloud Gateway를 통해 문서 관리 MSA로 전달되도록 구성했습니다. Ingress는 외부 요청을 경로별로 분기하고, Gateway는 내부 MSA 라우팅을 담당합니다.

5. **서비스 디스커버리 적용**  
   Gateway가 고정 IP나 주소에 의존하지 않고 Eureka에 등록된 서비스 이름을 기반으로 문서 관리 MSA를 탐색하도록 구성했습니다.

 **Gateway와 Eureka를 적용한 이유**

- Gateway를 문서 관리 MSA 전용 진입점으로 구성해 기존 API 구조를 변경하지 않고 신규 MSA를 확장할 수 있도록 설계
- Eureka의 서비스 등록 정보를 기반으로 인스턴스 변경 시에도 동적으로 라우팅해 Gateway와 MSA 간 네트워크 결합도 감소

https://github.com/user-attachments/assets/71c798de-b2dd-4266-a72a-fe93e9484e42

### Kafka 문서 데이터 연동
모놀리식 서비스의 원본 데이터 저장 흐름과 문서 관리 MSA의 조회용 데이터 갱신 흐름을 분리하기 위해, 데이터 변경 이벤트를 Kafka로 발행하고 문서 관리 MSA에서 비동기로 처리하도록 구성했습니다.

1. **이벤트 발행**  
   모놀리식 서비스에서 원본 데이터가 변경되거나 문서 인덱스 갱신이 필요한 경우, 관련 이벤트를 Kafka Topic으로 발행하도록 구성했습니다.

2. **Topic 설계**  
   문서 검색 Projection의 갱신 대상을 기준으로 Topic을 분리하고, 동일 Topic 내 실제 변경 행위는 `eventType`으로 구분했습니다.

3. **Key 설계**  
   동일 문서에 대한 변경 이벤트의 처리 순서를 보장하기 위해 `docCode`를 Kafka Message Key로 사용했습니다.

4. **Partition 설계**  
   문서 이벤트 처리량 증가에 대응할 수 있도록 Topic을 3개 Partition으로 구성했습니다. Partition 단위로 Consumer를 병렬 처리해 처리량을 확장할 수 있도록 설계했습니다.

5. **Consumer Group 구성**  
   문서 데이터 갱신 전용 Consumer Group을 구성하고, Partition 수에 맞춰 Consumer Member를 배치해 병렬 처리 구조를 마련했습니다.

6. **Batch 처리**  
   문서 이벤트의 빠른 수신과 조회용 Projection 갱신 특성을 고려해 Batch Listener를 적용했습니다. 갱신 대상 데이터를 모아 `saveAll` 기반으로 일괄 저장해 데이터 갱신 처리 효율을 높였습니다.

<img width="1000" height="500" alt="Kafka work-order changed event" src="https://github.com/user-attachments/assets/e83dce29-eb0f-4ab2-80a8-10a71ef155d7" />

#### 개선 결과
<img width="1365" height="362" alt="image" src="https://github.com/user-attachments/assets/6e3f0698-2188-4680-bcd5-dc3afd8f1485" />


<a id="elasticsearch-search"></a>
### 검색 기능 고도화

기존 문서 검색 API를 RDBMS의 복합 조건 조회와 `LIKE` 기반 키워드 검색으로 처리했습니다. 사용자 수가 `30명`에서 `100명`으로 증가하자 평균 TPS는 `54.3 → 62.2`로 소폭 증가했지만, 평균 응답 시간은 `223.69ms → 1,265.43ms`로 약 `5.66배` 증가했습니다.
<img width="618" height="369<img width="1236" height="737" alt="image_(2)" src="https://github.com/user-attachments/assets/d211a1a0-5473-4e2f-b966-3170b121262c" />

> **Situation**
> RDBMS 검색 구조에서 다중 조건 검색과 `LIKE` 기반 키워드 검색 시 인덱스 활용 효율이 낮아, 사용자 증가에 따라 문서 검색 응답 시간 병목이 발생했습니다.
>
> **Task**
> RDBMS 기반 문서 검색 병목을 해소하고, 사용자 증가 상황에서도 안정적인 검색 응답 시간을 확보해야 했습니다.

문서 검색 요청이 RDBMS의 복합 조건 조회와 `LIKE` 기반 검색에 의존하지 않도록, ECK Operator 기반 Elasticsearch·Logstash·Kibana 검색 구조로 전환했습니다.

```text
MariaDB 원본 데이터
  ↓
Logstash 증분 동기화 (updated_at 기준)
  ↓
Elasticsearch 인덱스
  ↓
문서 검색 API
```

#### 검색 구조 전환

1. **ECK 기반 Elasticsearch 클러스터 운영**
   VM에 Elasticsearch를 직접 구축하는 대신 Kubernetes 환경에서 ECK Operator로 Elasticsearch 클러스터를 구성했습니다. Elasticsearch·Logstash·Kibana를 분리 배포해 색인, 검색, 검증 역할을 나누고, Kibana로 클러스터 상태와 색인 결과를 확인했습니다.

2. **검색 인덱스 및 샤드 운영 구조 설계**
   문서 검색 데이터를 Elasticsearch 인덱스로 구성하고, 주요 검색 필드는 `text`·`keyword` 매핑을 적용해 전문 검색과 정확 일치 검색을 함께 지원했습니다. 검색 가용성과 부하 분산을 위해 3-Node Cluster를 구성하고 Primary·Replica 샤드 구조를 적용했습니다.

3. **검색 분석기 설계**
   한국어 검색 정확도를 높이기 위해 Nori 형태소 분석기를 적용했습니다. 또한 사용자 사전으로 건설 도메인 용어가 잘못 분리되지 않도록 하고, 동의어 필터를 적용해 동일 의미의 다양한 표현도 함께 검색되도록 구성했습니다.

4. **Logstash 기반 증분 색인**
   애플리케이션에서 직접 색인하는 방식 대신 Logstash를 통해 원본 RDB 데이터를 Elasticsearch에 동기화했습니다. `updated_at` 기준 증분 동기화와 DB 조회 스케줄러를 적용해 중복 색인을 방지하고, RDBMS를 원본 데이터로 유지해 Elasticsearch 장애 시에도 재색인이 가능하도록 구성했습니다.

   <img width="869" height="317" alt="image" src="https://github.com/user-attachments/assets/6431e314-389b-4e3b-b248-e8107fc0b538" />


<a id="performance-results"></a>
#### 개선 결과
<img width="1418" height="386" alt="image" src="https://github.com/user-attachments/assets/44e69fef-eba0-4bee-9dc6-f8f10578574b" />

[목차로 돌아가기](#toc)
