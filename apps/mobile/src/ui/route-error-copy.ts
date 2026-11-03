import { copy, type Lang } from "../i18n/copy";

export function routeErrorCopy(lang: Lang) {
  const strings = copy[lang];
  return {
    title: strings.routeErrorTitle,
    body: strings.routeErrorBody,
    retry: strings.routeErrorTryAgain,
    home: strings.routeErrorHome
  };
}
