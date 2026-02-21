{
  description = "Haruspex lab — home-manager configs";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { nixpkgs, home-manager, ... }: {
    homeConfigurations = {
      # RTX 4070 Ti workstation — Ubuntu 26.04
      "kubedoll@haruspex" = home-manager.lib.homeManagerConfiguration {
        pkgs = import nixpkgs { system = "x86_64-linux"; };
        modules = [
          ./common.nix
          ./hosts/haruspex.nix
        ];
      };

      # MacBook (future)
      # "kubedoll@macbook" = home-manager.lib.homeManagerConfiguration {
      #   pkgs = import nixpkgs { system = "aarch64-darwin"; };
      #   modules = [
      #     ./common.nix
      #     ./hosts/darwin.nix
      #   ];
      # };
    };
  };
}
