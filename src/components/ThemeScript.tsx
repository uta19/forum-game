// 在 <head> 中内联执行，避免闪烁
export function ThemeScript() {
  const script = `
    (function(){
      var h = new Date().getHours();
      if(h >= 18 || h < 6) document.documentElement.classList.add('dark');
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
