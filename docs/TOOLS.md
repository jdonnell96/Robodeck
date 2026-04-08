# Supported Tools

Robodeck ships with manifests for the following 15 tools. Each manifest defines the install command, launch behavior, health checks, and platform support.

## Annotation

| Tool | Description | Install Method | Platforms |
|------|-------------|----------------|-----------|
| [Label Studio](https://github.com/HumanSignal/label-studio) | Open source data labeling for images, text, audio, and video | pip (`pip install label-studio`) | macOS, Windows, Linux |
| [CVAT](https://github.com/cvat-ai/cvat) | Computer vision annotation for images and video datasets | Docker (`docker pull cvat/server:latest`) | macOS, Windows, Linux |

## Visualization and 3D Processing

| Tool | Description | Install Method | Platforms |
|------|-------------|----------------|-----------|
| [Rerun](https://github.com/rerun-io/rerun) | Multimodal data visualization for computer vision and robotics | pip (`pip install rerun-sdk`) | macOS, Windows, Linux |
| [Foxglove Studio](https://github.com/foxglove/studio) | Robotics data visualization and debugging platform | npm (`npm install -g @foxglove/studio`) | macOS, Windows, Linux |
| [Open3D](https://github.com/isl-org/Open3D) | 3D data processing for point clouds, meshes, and RGB-D | pip (`pip install open3d`) | macOS, Windows, Linux |
| [MeshLab](https://github.com/cnr-isti-vclab/meshlab) | Mesh processing and editing for 3D models | brew (`brew install --cask meshlab`) / apt | macOS, Linux |

## Simulation

| Tool | Description | Install Method | Platforms |
|------|-------------|----------------|-----------|
| [NVIDIA Isaac Sim](https://github.com/NVIDIA-Omniverse/IsaacSim) | GPU-accelerated robotics simulation on NVIDIA Omniverse | Docker (`docker pull nvcr.io/nvidia/isaac-sim:4.2.0`) | Windows, Linux |
| [Gazebo](https://github.com/gazebosim/gz-sim) | Open source 3D robotics simulator with physics engine | brew (`brew install gz-harmonic`) / apt | macOS, Linux |
| [MuJoCo](https://github.com/google-deepmind/mujoco) | Fast physics engine for robotics and RL research | pip (`pip install mujoco`) | macOS, Windows, Linux |

## Training and MLOps

| Tool | Description | Install Method | Platforms |
|------|-------------|----------------|-----------|
| [PyTorch](https://github.com/pytorch/pytorch) | Deep learning framework for tensor computation and neural networks | pip (`pip install torch torchvision torchaudio`) | macOS, Windows, Linux |
| [Ultralytics YOLO](https://github.com/ultralytics/ultralytics) | Object detection, segmentation, and pose estimation | pip (`pip install ultralytics`) | macOS, Windows, Linux |
| [MLflow](https://github.com/mlflow/mlflow) | ML lifecycle platform with experiment tracking and model registry | pip (`pip install mlflow`) | macOS, Windows, Linux |

## Infrastructure

| Tool | Description | Install Method | Platforms |
|------|-------------|----------------|-----------|
| [ROS 2](https://github.com/ros2/ros2) | Robot Operating System middleware for robotics applications | Docker (`docker pull ros:jazzy`) / apt | macOS, Linux |
| [JupyterLab](https://github.com/jupyterlab/jupyterlab) | Interactive notebook environment for data science and ML | pip (`pip install jupyterlab`) | macOS, Windows, Linux |
| [Docker Desktop](https://github.com/docker/docker-install) | Container runtime required by Docker-based tools | brew (`brew install --cask docker`) / apt / manual | macOS, Windows, Linux |

## Platform Notes

- **macOS:** All 15 tools are available. Isaac Sim is the exception -- it requires Windows or Linux with an NVIDIA GPU.
- **Windows:** Most tools are available. Gazebo and ROS 2 do not have native Windows support; use Docker or WSL.
- **Linux:** Full support for all tools. Some tools offer native apt packages as an alternative to Docker or pip.

Tools marked with platform-specific install commands (e.g., `install_cmd_linux`) will automatically use the appropriate command for your operating system.

## Adding Tools

Tool manifests are JSON files in the `tools/` directory. Each manifest specifies:

- `id`, `name`, `version`, `category`, `description`
- `install_type` and `install_cmd` (the command Robodeck runs to install)
- `launch_type` and `launch_cmd` (how the tool is started)
- `health_check` (HTTP, port, or process-based liveness check)
- `stop_cmd` (how to gracefully stop the tool)
- `supported_os` (optional platform restriction)

See any existing manifest in `tools/` for the full schema.
