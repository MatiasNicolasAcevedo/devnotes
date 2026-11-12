# syntax=docker/dockerfile:1
FROM node:24.21.0-alpine AS client-build
WORKDIR /app
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/index.html client/tsconfig*.json client/vite.config.ts ./
COPY client/src/ src/
COPY client/public/ public/
RUN npm run build

FROM eclipse-temurin:21.0.12_8-jdk-noble AS server-build
WORKDIR /workspace
COPY server/.mvn/ .mvn/
COPY --chmod=755 server/mvnw ./
COPY server/pom.xml ./
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -ntp -q dependency:resolve
COPY server/src/main/ src/main/
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -ntp -DskipTests package \
    && cp target/devnotes-server-*.jar /workspace/app.jar \
    && java -Djarmode=tools -jar app.jar extract --destination /workspace/runtime

# Use the musl build of the same Temurin JRE release for the existing nginx Alpine image.
FROM eclipse-temurin:21.0.12_8-jre-alpine AS jre
FROM nginx:1.30.5-alpine AS runtime
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"
ENV PORT=10000
RUN apk add --no-cache bash curl libstdc++ \
    && sed -Ei '/^user[[:space:]]/d; s|^pid[[:space:]]+[^;]+;|pid /tmp/devnotes-nginx.pid;|' /etc/nginx/nginx.conf \
    && chown nginx:nginx /etc/nginx/conf.d /etc/nginx/conf.d/default.conf /var/cache/nginx
COPY --from=jre /opt/java/openjdk/ /opt/java/openjdk/
COPY --from=client-build /app/dist/ /usr/share/nginx/html/
COPY --from=server-build /workspace/runtime/ /app/
COPY client/nginx.conf /opt/starter/nginx.conf.template
COPY --chmod=755 client/19-public-origin.sh /app/19-public-origin.sh
COPY --chmod=755 deploy/render/entrypoint.sh /app/entrypoint.sh
USER nginx
EXPOSE 10000
STOPSIGNAL SIGTERM
ENTRYPOINT ["/app/entrypoint.sh"]
CMD []
