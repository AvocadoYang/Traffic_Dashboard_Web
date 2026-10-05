import styled from "styled-components";

export const LoadingStation = styled.div`
  width: 15px;
  aspect-ratio: 1;
  display: grid;
  position: relative;
  right: 6px;
  bottom: 6px;
  border-radius: 50%;
  background:
    linear-gradient(0deg, rgb(0 0 0/50%) 30%, #0000 0 70%, rgb(0 0 0/100%) 0)
      50%/8% 100%,
    linear-gradient(90deg, rgb(0 0 0/25%) 30%, #0000 0 70%, rgb(0 0 0/75%) 0)
      50%/100% 8%;
  background-repeat: no-repeat;
  animation: l23 1s infinite steps(12);

  /* 底圖跟著深色主題變深時改成白的 */
  [data-map-canvas="dark"] & {
    background:
      linear-gradient(
          0deg,
          rgb(255 255 255/50%) 30%,
          #0000 0 70%,
          rgb(255 255 255/100%) 0
        )
        50%/8% 100%,
      linear-gradient(
          90deg,
          rgb(255 255 255/25%) 30%,
          #0000 0 70%,
          rgb(255 255 255/75%) 0
        )
        50%/100% 8%;
    background-repeat: no-repeat;
  }

  ::before,
  ::after {
    content: "";
    grid-area: 1/1;
    border-radius: 50%;
    background: inherit;
    opacity: 0.915;
    transform: rotate(30deg);
  }
  ::after {
    opacity: 0.83;
    transform: rotate(60deg);
  }
  @keyframes l23 {
    100% {
      transform: rotate(1turn);
    }
  }
`;
