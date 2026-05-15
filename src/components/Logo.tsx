import logoSrc from "@/assets/logo.png";

export function Logo({ size = 40, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src={logoSrc} alt="SWOT-PPG" width={size} height={size} className="rounded-md" />
      {withText && (
        <div className="leading-tight">
          <div className="text-lg font-bold tracking-tight text-primary">SWOT-PPG</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Análise Estratégica · PPG
          </div>
        </div>
      )}
    </div>
  );
}
