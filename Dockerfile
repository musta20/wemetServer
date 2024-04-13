# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

ARG NODE_VERSION=20.11.0

# Install DEB dependencies and others.



FROM node:${NODE_VERSION} AS stage-one

# Use production node environment by default.


WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.yarn to speed up subsequent builds.
# Leverage a bind mounts to package.json and yarn.lock to avoid having to copy them into
# into this layer.
COPY  . .

RUN set -x \
	&& apt-get update \
	&& apt-get install -y net-tools build-essential python3 python3-pip valgrind  \
    && yarn install



# Expose the port that the application listens on.
# EXPOSE 6800

# Run the application.
CMD yarn startDev


