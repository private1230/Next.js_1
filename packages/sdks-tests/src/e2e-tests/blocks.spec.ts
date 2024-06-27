import { expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { VIDEO_CDN_URL } from '../specs/video.js';
import type { ExpectedStyles } from '../helpers/index.js';
import {
  excludeRn,
  excludeTestFor,
  checkIsRN,
  test,
  isSSRFramework,
  mockFolderPath,
} from '../helpers/index.js';

test.describe('Blocks', () => {
  test('Text', async ({ page, sdk, packageName }) => {
    test.fail(packageName === 'hydrogen');
    test.fail(excludeRn(sdk));
    await page.goto('/text-block');

    const textBlocks = page.locator('.builder-text');

    await expect(textBlocks).toHaveCount(3);

    const paragraphClasses = await textBlocks.nth(0).locator('*').all();
    const soloPTag = await textBlocks.nth(1).locator('*').first();
    const pTags = await textBlocks.nth(2).locator('*').all();

    for (const child of paragraphClasses) {
      await expect(child).toHaveCSS('margin-top', '0px');
      await expect(child).toHaveCSS('margin-bottom', '0px');
      await expect(child).toHaveCSS('margin-left', '0px');
      await expect(child).toHaveCSS('margin-right', '0px');
    }

    await expect(soloPTag).toHaveCSS('margin-top', '0px');
    await expect(soloPTag).toHaveCSS('margin-bottom', '0px');
    await expect(soloPTag).toHaveCSS('margin-left', '0px');
    await expect(soloPTag).toHaveCSS('margin-right', '0px');

    const [firstPTag, ...otherPTags] = pTags;

    await expect(firstPTag).toHaveCSS('margin-top', '0px');
    await expect(firstPTag).toHaveCSS('margin-bottom', '0px');
    await expect(firstPTag).toHaveCSS('margin-left', '0px');
    await expect(firstPTag).toHaveCSS('margin-right', '0px');

    for (const child of otherPTags) {
      await expect(child).toHaveCSS('margin-top', '16px');
      await expect(child).toHaveCSS('margin-bottom', '16px');
      await expect(child).toHaveCSS('margin-left', '0px');
      await expect(child).toHaveCSS('margin-right', '0px');
    }
  });

  test('Button', async ({ page, sdk }) => {
    await page.goto('/reactive-state');
    const button = checkIsRN(sdk)
      ? page.locator('button')
      : page.getByRole('button', { name: 'Increment Number' });

    await expect(button).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  });

  test.describe('Image', () => {
    test('Image size', async ({ page, sdk, packageName }) => {
      test.skip(checkIsRN(sdk));
      test.skip(
        isSSRFramework(packageName),
        'SSR frameworks get the images from the server so page.route intercept does not work'
      );
      const mockImgPath = path.join(mockFolderPath, 'placeholder-img.png');
      const mockImgBuffer = fs.readFileSync(mockImgPath);

      await page.route('**/*', route => {
        const request = route.request();
        if (request.url().includes('cdn.builder.io/api/v1/image')) {
          return route.fulfill({
            status: 200,
            contentType: 'image/png',
            body: mockImgBuffer,
          });
        } else {
          return route.continue();
        }
      });

      await page.goto('/image');

      const imageLocator = page.locator('.builder-image');

      const expected: Record<string, string>[] = [
        // first img is a webp image. React Native SDK does not yet support webp.
        ...(checkIsRN(sdk)
          ? []
          : [
              {
                width: '604px',
                height: '670.438px',
                'object-fit': 'cover',
              },
            ]),
        {
          width: '1264px',
          height: '240.156px',
          // RN SDK does not support object-fit
          'object-fit': checkIsRN(sdk) ? 'fill' : 'cover',
        },
        {
          width: '604px',
          height: '120.797px',
          // RN SDK does not support object-fit
          'object-fit': checkIsRN(sdk) ? 'fill' : 'contain',
        },
        {
          width: '600px',
          height: '400px',
        },
      ];

      await expect(imageLocator).toHaveCount(expected.length);

      const expectedVals = expected.map((val, i) => ({ val, i }));

      for (const { val, i } of Object.values(expectedVals)) {
        const image = imageLocator.nth(i);
        const expected = val;
        for (const property of Object.keys(expected)) {
          await expect(image).toHaveCSS(property, expected[property]);
        }
      }
    });

    test('Image high priority', async ({ page, sdk, packageName }) => {
      test.skip(checkIsRN(sdk));
      test.skip(
        isSSRFramework(packageName),
        'SSR frameworks get the images from the server so page.route intercept does not work'
      );
      const mockImgPath = path.join(mockFolderPath, 'placeholder-img.png');
      const mockImgBuffer = fs.readFileSync(mockImgPath);

      await page.route('**/*', route => {
        const request = route.request();
        if (request.url().includes('cdn.builder.io/api/v1/image')) {
          return route.fulfill({
            status: 200,
            contentType: 'image/png',
            body: mockImgBuffer,
          });
        } else {
          return route.continue();
        }
      });

      await page.goto('/image-high-priority');

      const imageLocator = page.locator('.builder-image');

      const expected: Record<string, string>[] = [
        // first img is a webp image. React Native SDK does not yet support webp.
        ...(checkIsRN(sdk)
          ? []
          : [
              {
                fetchpriority: 'high',
                loading: 'eager',
              },
            ]),
        {
          fetchpriority: 'auto',
          loading: 'lazy',
        },
        {
          fetchpriority: 'auto',
          loading: 'lazy',
        },
        {
          fetchpriority: 'high',
          loading: 'eager',
        },
      ];

      await expect(imageLocator).toHaveCount(expected.length);

      const expectedVals = expected.map((val, i) => ({ val, i }));

      for (const { val, i } of Object.values(expectedVals)) {
        const image = imageLocator.nth(i);
        const expected = val;
        for (const property of Object.keys(expected)) {
          await expect(image).toHaveAttribute(property, expected[property]);
        }
      }
    });
  });

  test.describe('Video', () => {
    test('video render and styles', async ({ page, sdk }) => {
      test.skip(checkIsRN(sdk));
      const mockVideoPath = path.join(mockFolderPath, 'video.mp4');
      const mockVideoBuffer = fs.readFileSync(mockVideoPath);

      await page.route('**/*', route => {
        const request = route.request();
        if (request.url().includes(VIDEO_CDN_URL)) {
          return route.fulfill({
            status: 200,
            contentType: 'video/mp4',
            body: mockVideoBuffer,
          });
        } else {
          return route.continue();
        }
      });

      await page.goto('/video');

      const videoLocator = page.locator('video');

      const expectedCSS: Record<string, string>[] = [
        {
          width: '152px',
          'object-fit': 'cover',
          'z-index': '2',
          'border-radius': '1px',
          position: 'absolute',
        },
        {
          width: '1249px',
          'object-fit': 'contain',
          'z-index': '2',
          'border-radius': '1px',
          position: 'absolute',
        },
        {
          width: '744px',
          'object-fit': 'cover',
          'z-index': '2',
          'border-radius': '1px',
          position: 'absolute',
        },
        {
          width: '152px',
          'object-fit': 'cover',
          'z-index': '2',
          'border-radius': '1px',
          position: 'absolute',
        },
      ];

      await expect(videoLocator).toHaveCount(expectedCSS.length);

      const expectedVals = expectedCSS.map((val, i) => ({ val, i }));

      for (const { val, i } of Object.values(expectedVals)) {
        const video = videoLocator.nth(i);
        const expected = val;
        for (const property of Object.keys(expected)) {
          await expect(video).toHaveCSS(property, expected[property]);
        }
      }
    });

    test('video children', async ({ page, sdk }) => {
      test.skip(checkIsRN(sdk));
      const mockVideoPath = path.join(mockFolderPath, 'video.mp4');
      const mockVideoBuffer = fs.readFileSync(mockVideoPath);

      await page.route('**/*', route => {
        const request = route.request();
        if (request.url().includes(VIDEO_CDN_URL)) {
          return route.fulfill({
            status: 200,
            contentType: 'video/mp4',
            body: mockVideoBuffer,
          });
        } else {
          return route.continue();
        }
      });

      await page.goto('/video');

      const videoContainers = page.locator('.some-class');
      const noOfVideos = await page.locator('.builder-video').count();

      await expect(noOfVideos).toBeGreaterThanOrEqual(1);
      await expect(videoContainers).toHaveCount(noOfVideos);

      for (let i = 0; i < noOfVideos; i++) {
        const container = videoContainers.nth(i);
        const textBlock = container.locator('.builder-text p');
        await expect(textBlock).toBeVisible();
        await expect(textBlock).toHaveText('asfgasgasgasg some test');
      }
    });
  });

  test.describe('Columns', () => {
    type ColumnTypes =
      | 'stackAtTablet'
      | 'stackAtTabletReverse'
      | 'stackAtMobile'
      | 'stackAtMobileReverse'
      | 'neverStack';

    type SizeName = 'mobile' | 'tablet' | 'desktop';
    type Size = {
      width: number;
      height: number;
    };

    const sizes: Record<SizeName, Size> = {
      mobile: { width: 300, height: 700 },
      tablet: { width: 930, height: 700 },
      desktop: { width: 1200, height: 700 },
    };

    type ColStyles = {
      columns: ExpectedStyles;
      column: ExpectedStyles;
    };

    const ROW: ColStyles = {
      columns: {
        'flex-direction': 'row',
      },
      column: {
        'margin-left': '20px',
      },
    };

    const NO_LEFT_MARGIN = { 'margin-left': '0px' } as const;

    const expected: Record<ColumnTypes, Record<SizeName, ColStyles> & { index: number }> = {
      stackAtTablet: {
        index: 0,
        mobile: { columns: { 'flex-direction': 'column' }, column: NO_LEFT_MARGIN },
        tablet: { columns: { 'flex-direction': 'column' }, column: NO_LEFT_MARGIN },
        desktop: ROW,
      },
      stackAtTabletReverse: {
        index: 1,
        mobile: { columns: { 'flex-direction': 'column-reverse' }, column: NO_LEFT_MARGIN },
        tablet: { columns: { 'flex-direction': 'column-reverse' }, column: NO_LEFT_MARGIN },
        desktop: ROW,
      },
      stackAtMobile: {
        index: 2,
        mobile: { columns: { 'flex-direction': 'column' }, column: NO_LEFT_MARGIN },
        tablet: ROW,
        desktop: ROW,
      },
      stackAtMobileReverse: {
        index: 3,
        mobile: { columns: { 'flex-direction': 'column-reverse' }, column: NO_LEFT_MARGIN },
        tablet: ROW,
        desktop: ROW,
      },
      neverStack: {
        index: 4,
        mobile: ROW,
        tablet: ROW,
        desktop: ROW,
      },
    };

    for (const entry of Object.entries(sizes)) {
      const [sizeName, size] = entry as [SizeName, Size];

      test.describe(sizeName, () => {
        for (const [columnType, styles] of Object.entries(expected)) {
          test(columnType, async ({ page, sdk }) => {
            test.skip(
              checkIsRN(sdk) && sizeName !== 'mobile',
              "intermittent success, can't use test.fail()"
            );

            test.fail(
              (sizeName === 'mobile' || sizeName === 'tablet') &&
                excludeTestFor({ angular: true }, sdk)
            );
            await page.setViewportSize(size);
            await page.goto('/columns');
            const columns = checkIsRN(sdk)
              ? page.locator('[data-builder-block-name=builder-columns]')
              : page.locator('.builder-columns');

            await expect(columns).toHaveCount(5);
            for (const property of Object.keys(styles[sizeName].columns)) {
              await expect(columns.nth(styles.index)).toHaveCSS(
                property,
                styles[sizeName].columns[property]
              );
            }

            const columnLocator = checkIsRN(sdk)
              ? columns.nth(styles.index).locator('[data-builder-block-name=builder-column]')
              : columns.nth(styles.index).locator('.builder-column');

            // first column should never have left margin
            await expect(columnLocator.nth(0)).toHaveCSS(
              'margin-left',
              NO_LEFT_MARGIN['margin-left']
            );

            const expected = styles[sizeName].column;
            for (const property of Object.keys(expected)) {
              await expect(columnLocator.nth(1)).toHaveCSS(property, expected[property]);
            }
          });
        }
      });
    }
  });
});
