# Variables
IMAGE_NAME = capacity-building-visualization
TAG = latest
REGISTRY = ghcr.io
FULL_IMAGE_NAME = $(REGISTRY)/$(IMAGE_NAME):$(TAG)

# Build the Docker image
build:
	docker build -t $(IMAGE_NAME):$(TAG) .

# Tag the image for GCP
tag: build
	docker tag $(IMAGE_NAME):$(TAG) $(FULL_IMAGE_NAME)

# Push the image to GCP Container Registry
push: tag
	docker push $(FULL_IMAGE_NAME)

# Clean up local images
clean:
	docker rmi $(IMAGE_NAME):$(TAG) $(FULL_IMAGE_NAME) || true

# All-in-one command to build, tag, and push
all: build tag push

deploy:
	@cd ../ansible && ./deploy.sh

.PHONY: build tag push clean all
