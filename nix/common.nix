# Common home-manager config shared across all machines.
# Brew installs the binaries; home-manager manages the configs.
# Use `package = pkgs.emptyDirectory` to skip nix-managed installation
# (only for modules that don't inspect the package version).

{ pkgs, ... }: {
  home.stateVersion = "24.11";
  programs.home-manager.enable = true;

  # ---------------------------------------------------------------------------
  # Shell
  # ---------------------------------------------------------------------------

  programs.bash = {
    enable = true;
    shellAliases = {
      ll = "eza -la --icons --git";
      ls = "eza";
      lt = "eza --tree --level=2";
      cat = "bat --paging=never";
      g = "git";
      k = "kubectl";
      dc = "docker compose";
      du = "dust";
      ".." = "cd ..";
      "..." = "cd ../..";
    };
    initExtra = ''
      # Shell tool integrations (brew-installed binaries, not nix)
      #
      # bash-preexec must load before starship/atuin so they detect it and use
      # precmd_functions/preexec_functions arrays.
      #
      # WORKAROUND: systemd 256+ (Ubuntu 26.04) initializes PROMPT_COMMAND as
      # an array via /etc/profile.d/80-systemd-osc-context.sh. bash-preexec's
      # __bp_install replaces PROMPT_COMMAND[0] with a string but leaves its
      # install string in [1]. That install string runs "trap - DEBUG" on every
      # prompt, then __bp_install's guard returns early without re-setting it.
      # Result: the DEBUG trap (which fires preexec) gets nuked every cycle.
      # Fix: collapse PROMPT_COMMAND to a string before bash-preexec loads.
      __flatten_prompt_command() {
        if [[ "$(declare -p PROMPT_COMMAND 2>/dev/null)" == "declare -a"* ]]; then
          local _pc="" _cmd
          for _cmd in "''${PROMPT_COMMAND[@]}"; do
            [[ -z "$_cmd" ]] && continue
            _pc+="''${_pc:+;}$_cmd"
          done
          unset PROMPT_COMMAND
          PROMPT_COMMAND="$_pc"
        fi
      }
      __flatten_prompt_command
      unset -f __flatten_prompt_command

      [[ -f ~/.bash-preexec.sh ]] && source ~/.bash-preexec.sh
      command -v starship &>/dev/null && eval "$(starship init bash)"
      command -v zoxide &>/dev/null && eval "$(zoxide init bash)"
      command -v direnv &>/dev/null && eval "$(direnv hook bash)"
      command -v atuin &>/dev/null && eval "$(atuin init bash)"
      command -v mise &>/dev/null && eval "$(mise activate bash)"

      # Source local overrides if present
      [ -f ~/.bashrc.local ] && source ~/.bashrc.local
    '';
  };

  # ---------------------------------------------------------------------------
  # Prompt — Starship
  # ---------------------------------------------------------------------------

  programs.starship = {
    enable = true;
    package = pkgs.emptyDirectory; # brew-installed
    enableBashIntegration = false; # manual init in bash.initExtra
    settings = {
      add_newline = false;
      format = "$username$hostname$directory$git_branch$git_status$rust$python$nodejs$docker_context$kubernetes$nix_shell$cmd_duration$line_break$character";

      character = {
        success_symbol = "[❯](bold green)";
        error_symbol = "[❯](bold red)";
      };

      directory = {
        truncation_length = 3;
        truncation_symbol = "…/";
      };

      git_branch.format = "[$symbol$branch(:$remote_branch)]($style) ";
      git_status.format = "([$all_status$ahead_behind]($style) )";

      cmd_duration = {
        min_time = 2000;
        format = "[$duration]($style) ";
      };

      kubernetes = {
        disabled = false;
        format = "[$symbol$context(/$namespace)]($style) ";
      };

      nix_shell = {
        disabled = false;
        format = "[$symbol$state]($style) ";
      };

      docker_context.disabled = true; # noisy on machines with Docker
    };
  };

  # ---------------------------------------------------------------------------
  # Git + Delta
  # ---------------------------------------------------------------------------

  programs.git = {
    enable = true;

    settings = {
      user.name = "cagyirey";
      user.email = "8145742+cagyirey@users.noreply.github.com";
      init.defaultBranch = "main";
      push.autoSetupRemote = true;
      pull.rebase = true;
      rerere.enabled = true;
      core.pager = "delta";
      interactive.diffFilter = "delta --color-only";
      diff.algorithm = "histogram";
      diff.colorMoved = "default";
      merge.conflictStyle = "zdiff3";

      # SSH commit signing (key operations forwarded to local 1Password agent)
      gpg.format = "ssh";
      commit.gpgsign = true;
      tag.gpgsign = true;
      user.signingkey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDMpDt4C6gPqO2K93gHLXrns4zpznwqe+VgUyC8jjzBd";
      gpg.ssh.allowedSignersFile = "~/.ssh/allowed_signers";
      # NOTE: do NOT set gpg.ssh.program here — omitting it lets git use the
      # forwarded SSH agent. op-ssh-sign is only for machines with the desktop app.

      alias = {
        co = "checkout";
        br = "branch";
        ci = "commit";
        st = "status -sb";
        lg = "log --oneline --graph --decorate --all";
        unstage = "reset HEAD --";
        last = "log -1 HEAD";
        amend = "commit --amend --no-edit";
      };
    };
  };

  # Delta config (brew-installed as git-delta, git pager set above)
  xdg.configFile."delta/themes.gitconfig".text = ''
    [delta]
      navigate = true
      side-by-side = true
      line-numbers = true
      hyperlinks = true
  '';

  # ---------------------------------------------------------------------------
  # tmux
  # ---------------------------------------------------------------------------

  programs.tmux = {
    enable = true;
    package = pkgs.emptyDirectory; # system-installed
    terminal = "tmux-256color";
    baseIndex = 1;
    escapeTime = 0;
    historyLimit = 50000;
    mouse = true;
    keyMode = "vi";

    extraConfig = ''
      # True color support
      set -ag terminal-overrides ",xterm-256color:RGB"

      # Status bar
      set -g status-position top
      set -g status-interval 5

      # Pane splitting with current path
      bind | split-window -h -c "#{pane_current_path}"
      bind - split-window -v -c "#{pane_current_path}"
      unbind '"'
      unbind %

      # Pane navigation (vim-style)
      bind h select-pane -L
      bind j select-pane -D
      bind k select-pane -U
      bind l select-pane -R

      # Pane resizing
      bind -r H resize-pane -L 5
      bind -r J resize-pane -D 5
      bind -r K resize-pane -U 5
      bind -r L resize-pane -R 5

      # Reload config
      bind r source-file ~/.config/tmux/tmux.conf \; display "Config reloaded"
    '';
  };

  # ---------------------------------------------------------------------------
  # CLI tool configs (binaries from brew, config from home-manager)
  # ---------------------------------------------------------------------------

  # fzf inspects package.version, so let nix install it (it's tiny)
  programs.fzf = {
    enable = true;
    enableBashIntegration = true;
    defaultOptions = [ "--height 40%" "--layout=reverse" "--border" "--info=inline" ];
    defaultCommand = "fd --type f --hidden --follow --exclude .git";
    changeDirWidgetCommand = "fd --type d --hidden --follow --exclude .git";
  };

  programs.zoxide = {
    enable = true;
    package = pkgs.emptyDirectory; # brew-installed
    enableBashIntegration = false; # manual init in bash.initExtra
  };

  programs.direnv = {
    enable = true;
    package = pkgs.emptyDirectory; # brew-installed
    enableBashIntegration = false; # manual init in bash.initExtra
    nix-direnv.enable = true;
  };

  # Bat: config only, disable cache build (brew owns the binary)
  xdg.configFile."bat/config".text = ''
    --theme="Dracula"
    --italic-text=always
    --map-syntax="*.jenkinsfile:Groovy"
    --map-syntax="*.props:Java Properties"
  '';

  programs.atuin = {
    enable = true;
    package = pkgs.emptyDirectory; # brew-installed
    enableBashIntegration = false; # manual init in bash.initExtra
    settings = {
      auto_sync = false;
      search_mode = "fuzzy";
      style = "compact";
      show_preview = true;
      max_preview_height = 4;
      filter_mode_shell_up_key_binding = "directory"; # up-arrow searches cwd history
      filter_mode = "global";                          # Ctrl+R searches everything
      history_filter = [
        "^secret"
        "password"
        "token"
        "export.*KEY"
        "^op\\s"                                       # 1Password CLI invocations
      ];
    };
  };

  programs.lazygit = {
    enable = true;
    package = pkgs.emptyDirectory; # brew-installed
    settings = {
      gui = {
        showIcons = true;
        nerdFontsVersion = "3";
      };
      git.paging = {
        pager = "delta --dark --paging=never";
      };
    };
  };

  # ---------------------------------------------------------------------------
  # Rust toolchain config (rustup-installed, cargo config managed here)
  # ---------------------------------------------------------------------------

  home.file.".cargo/config.toml".text = ''
    [build]
    rustc-wrapper = "sccache"

    [target.x86_64-unknown-linux-gnu]
    rustflags = ["-C", "link-arg=-fuse-ld=mold"]
  '';

  # ---------------------------------------------------------------------------
  # Environment
  # ---------------------------------------------------------------------------

  home.sessionVariables = {
    EDITOR = "vim";
    VISUAL = "vim";
    LESS = "-R --mouse";
    MANPAGER = "sh -c 'col -bx | bat -l man -p'";
  };

  home.sessionPath = [
    "$HOME/.local/bin"
    "$HOME/.cargo/bin"
    "/usr/local/cuda/bin"
  ];
}
