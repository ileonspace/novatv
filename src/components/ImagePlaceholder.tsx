// 图片占位符组件 - 静态骨架（无动画，避免视觉干扰）
const ImagePlaceholder = ({ aspectRatio }: { aspectRatio: string }) => (
  <div
    className={`w-full ${aspectRatio} rounded-lg bg-gray-200 dark:bg-gray-800`}
  />
);

export { ImagePlaceholder };
