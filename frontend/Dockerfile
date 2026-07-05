FROM node:24.13.0-slim AS builder

WORKDIR /app

COPY ./package.json ./

RUN npm install ./

COPY ./ ./

# Vite는 빌드 시점에 VITE_* 를 번들에 박음. 같은 이미지로 test/main 모두 배포 시 Kaniko 에서 덮어쓸 수 있음
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginx:latest

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]