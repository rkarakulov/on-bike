// Metro отдаёт картинку как числовой id ассета (ImageRequireSource)
declare module '*.png' {
  const asset: number;
  export default asset;
}
