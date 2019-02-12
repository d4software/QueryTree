# Docker Hub

We maintain an image of QueryTree on the docker hub at [d4software/querytree](https://hub.docker.com/r/d4software/querytree/). The `latest` tag points to the HEAD of the master branch.

## How to use the docker hub image

```sh
docker run -p 8080:80 --name querytree -d d4software/querytree:latest
```

The image runs QueryTree Web on port 80 so you'll need to proxy through to port 80.

`--name` Sets a name for the container, this can be anything you want. It makes it easier to re-run this container with your saved configurations later. If this is not set docker will assign a random name to the container. 

### Confirm the container is running

`docker container ls` returns:

```sh
CONTAINER ID        IMAGE                         COMMAND                  CREATED             STATUS              PORTS                  NAMES
9a75b09da5cd        d4software/querytree:latest   "/bin/sh -c 'dotnet …"   11 seconds ago      Up 11 seconds       0.0.0.0:8080->80/tcp   querytree
```

### Stopping the container

```sh
docker stop querytree
```

### Starting a stopped container

```sh
docker start querytree
```

## Override configuration defaults

Query tree uses an appsettings.json file to store advanced configuration settings. You may need to change some of these settings when deploying QueryTree or when you need an advanced feature that is disabled by default.

To override these settings in docker you can provide an enviroment variable that matches the configuration name in [appsettings.json](/Web/appsettings.json).

The format for these enviroment variables match the JSON structure of the file but instead of using dot notation you need to replace the DOT (.) with two underscores(__).

Take the `Customization.SystemName` configuration as an example. 

```json
{
    "Customization": {
        "SystemName": "QueryTree"
     }
}
```

To override this setting in docker you need to supply an enviroment variable called `Customization__SystemName`

You can then pass this into docker as

```sh
docker run -p 8080:80 --name querytree -d -e Customization__SystemName="Acme Reporting" d4software/querytree:latest
```

If you need a more permanent solution consider building a custom docker image with the appropriate appsettings.json file in [/Web/appsettings.json](/Web/appsettings.json)

Read more about:

- [Enviroment variables in docker](https://docs.docker.com/engine/reference/run/#env-environment-variables)
- [appsettings.json in ASP.NET Core](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/configuration/?view=aspnetcore-2.1&tabs=basicconfiguration)

## Use QueryTree to query a DB inside a docker network

You may want to run queries on a database that is not exposed to the host machine and exists soley withina a [docker network](https://docs.docker.com/network/).

To link QueryTree and your DB to the same network you'll need to create a [user defined bridge](https://docs.docker.com/network/bridge/#manage-a-user-defined-bridge) and place both containers within it.

### Create the network

```sh
docker network create querynet
```

### Connect a running container to the network

```sh
docker network connect querynet querytree
```

### Example with running MySQL in the same network

```sh
docker run --name some-mysql -e MYSQL_ALLOW_EMPTY_PASSWORD=true --network querynet mysql:latest
```

To find the IP of the container run:

```sh
docker network inspect querynet
```

You should then see something like this:

```json
"Containers": {
            "9a75b09da5cd3a20a5b53175c0d72354cc9b62a1492fa241ea97f47ab3778e27": {
                "Name": "querytree",
                "EndpointID": "8c650f3aabb75cdb4961bbdfbaf34e18a69ba50b0bb82bef48274414248159df",
                "MacAddress": "02:42:ac:13:00:02",
                "IPv4Address": "172.19.0.2/16",
                "IPv6Address": ""
            },
            "dfc14f6b596c6c71738602c5ad2e2b8a7df72c7046446e5ec1dddded3c7a9120": {
                "Name": "some-mysql",
                "EndpointID": "962ba0cab359c03b1028fa2339bbaf2c9366caf9f9b74fb812c30828d3402626",
                "MacAddress": "02:42:ac:13:00:03",
                "IPv4Address": "172.19.0.3/16",
                "IPv6Address": ""
            }
        }
```

**some-mysql** will be accesible by the **querytree** container at **172.19.0.3:3306**, without needing some-mysql to be exposed to the network

## Building locally

You can optionally build and run the image locally. This is useful if you do not have the .NET-core sdk or you need to run QueryTree inside a container with some custom changes you've made.

The Dockerfile uses multistage builds. It builds and runs QueryTree in two steps. The second stage builds the final image that gets run.

To build a local container image using this method you can run the following command in the project root:

```sh
docker build -t querytree .
```

### Skipping the build step

If you don't wish to make use of the first build step and do have .NET installed on the host system you can achieve this by commenting out the build step in the Dockerfile.

Then change the COPY line in the runtime step to point to the piblish dir of the host.
