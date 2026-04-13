type StrikrBadgeMarkProps = {
  className?: string;
};

export default function StrikrBadgeMark({
  className = "",
}: StrikrBadgeMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: "currentColor",
        WebkitMaskImage: 'url("/brand/strikr-mark-clean.svg")',
        maskImage: 'url("/brand/strikr-mark-clean.svg")',
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}