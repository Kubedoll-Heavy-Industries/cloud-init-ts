# Haruspex-specific home-manager config.
# RTX 4070 Ti workstation — Ubuntu 26.04

{ pkgs, ... }: {
  home.username = "kubedoll";
  home.homeDirectory = "/home/kubedoll";

  # ---------------------------------------------------------------------------
  # Linux-specific session variables
  # ---------------------------------------------------------------------------

  home.sessionVariables = {
    # CUDA (RTX 4070 Ti = Ada Lovelace, compute capability 8.9)
    CUDA_HOME = "/usr/local/cuda";
    CUDA_COMPUTE_CAP = "89";
    LD_LIBRARY_PATH = "/usr/local/cuda/lib64\${LD_LIBRARY_PATH:+:\$LD_LIBRARY_PATH}";
  };

  # ---------------------------------------------------------------------------
  # Homebrew PATH (Linux Homebrew)
  # ---------------------------------------------------------------------------

  programs.bash.initExtra = ''
    # Homebrew (Linux)
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
  '';

  # ---------------------------------------------------------------------------
  # GPU monitoring aliases
  # ---------------------------------------------------------------------------

  programs.bash.shellAliases = {
    gpu = "nvidia-smi";
    gpuw = "watch -n1 nvidia-smi";
    temps = "sensors";
  };
}
