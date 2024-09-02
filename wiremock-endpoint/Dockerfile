FROM wiremock/wiremock

EXPOSE 8080

CMD ["wiremock", "--global-response-templating", "--proxy-all=http://localhost:8080"]
