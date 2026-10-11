import { describe, expect, it } from 'vitest';
import { detect } from './homeScreen';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.122 Mobile/15E148 Safari/604.1',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.28.85',
  ipadDesktopMode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  androidSamsung:
    'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};

describe('which install steps a phone gets', () => {
  it('tells iPhones and Android phones apart, and the browser on each', () => {
    expect(detect(UA.iphoneSafari)).toEqual({ platform: 'ios', browser: 'safari' });
    expect(detect(UA.iphoneChrome)).toEqual({ platform: 'ios', browser: 'chrome' });
    expect(detect(UA.androidChrome)).toEqual({ platform: 'android', browser: 'chrome' });
    expect(detect(UA.androidSamsung)).toEqual({ platform: 'android', browser: 'samsung' });
    expect(detect(UA.androidFirefox)).toEqual({ platform: 'android', browser: 'other' });
  });

  it('spots browsers inside other apps, which cannot install', () => {
    expect(detect(UA.iphoneInstagram).browser).toBe('inapp');
    expect(detect(UA.androidWebView).browser).toBe('inapp');
  });

  it('knows an iPad asking for the desktop site by its touch screen', () => {
    expect(detect(UA.ipadDesktopMode, 5)).toEqual({ platform: 'ios', browser: 'safari' });
    expect(detect(UA.ipadDesktopMode, 0).platform).toBe('other');
  });

  it('suggests nothing on a computer', () => {
    expect(detect(UA.windowsChrome).platform).toBe('other');
  });
});
