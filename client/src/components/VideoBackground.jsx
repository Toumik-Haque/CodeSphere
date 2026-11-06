import { useEffect, useRef } from 'react';
import '../css/VideoBackground.css';
import campusVideo from '../assets/campusVideo.mp4';

// rotate: 'left' or 'right' turns a sideways-recorded video upright (90deg).
const VideoBackground = ({ src = campusVideo, rotate }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    video.playbackRate = 0.5;
  }, []);

  return (
    <div
      className="video-background  top-0 start-0 w-100 h-100 overflow-hidden"
      aria-hidden="true"
    >
      <video
        key={src}
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className={`video-background-media ${rotate ? `is-rotated-${rotate}` : ''}`}
      >
        <source src={src} type="video/mp4" />
      </video>

      <div className="video-background-overlay position-absolute top-0 start-0 w-100 h-100" />
    </div>
  );
};

export default VideoBackground;