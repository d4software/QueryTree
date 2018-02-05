FROM microsoft/dotnet:2.0-sdk-stretch as builder
WORKDIR /build
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release ./Web/QueryTree.csproj -o /dist


FROM microsoft/aspnetcore:2.0-stretch as runtime
WORKDIR /app
COPY --from=builder /dist .
VOLUME /var/lib/querytree
ENV ConnectionStrings__DefaultConnection="Filename=/var/lib/querytree/querytree.db;"
CMD dotnet QueryTree.dll
