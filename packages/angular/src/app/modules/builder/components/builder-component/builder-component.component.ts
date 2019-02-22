import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { parse } from 'url';

function delay<T = any>(duration: number, resolveValue?: T) {
  return new Promise<T>(resolve => setTimeout(() => resolve(resolveValue), duration));
}

export interface RouteEvent {
  /**
   * Url being routed to
   */
  url: string;
  /**
   * Html anchor element the href is on that
   * caused the route
   */
  anchorNode: HTMLAnchorElement;
  /**
   * Has preventDefault() been called preventing
   * builder from routing to the clicked URL
   */
  defaultPrevented: boolean;
  /**
   * Prevents builder from handling routing for you to handle
   * yourself
   */
  preventDefault(): void;
}

@Component({
  selector: 'builder-component',
  templateUrl: './builder-component.component.html',
  styleUrls: ['./builder-component.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuilderComponentComponent {
  @Input() model: string | undefined /* THIS IS ACTUALLY REQUIRED */;

  @Input() handleRouting = true;

  @Output() load = new EventEmitter<any>();
  @Output() route = new EventEmitter<RouteEvent>();
  @Output() error = new EventEmitter<any>();

  constructor(private router: Router) {}

  // TODO: this should be in BuilderBlocks
  async onClick(event: MouseEvent) {
    if (!this.handleRouting) {
      return;
    }

    if (event.button !== 0 || event.ctrlKey || event.defaultPrevented) {
      // If this is a non-left click, or the user is holding ctr/cmd, or the url is absolute,
      // or if the link has a target attribute, don't route on the client and let the default
      // href property handle the navigation
      return;
    }

    const hrefTarget = this.findHrefTarget(event);
    if (!hrefTarget) {
      return;
    }

    // target="_blank" or target="_self" etc
    if (hrefTarget.target) {
      return;
    }

    let href = hrefTarget.getAttribute('href');
    if (!href) {
      return;
    }

    const routeEvent: RouteEvent = {
      url: href,
      anchorNode: hrefTarget,
      preventDefault() {
        this.defaultPrevented = true;
      },
      defaultPrevented: false,
    };
    this.route.next(routeEvent);

    if (routeEvent.defaultPrevented) {
      event.preventDefault();
      return;
    }

    if (event.metaKey) {
      return;
    }

    if (!this.isRelative(href)) {
      const converted = this.convertToRelative(href);
      if (converted) {
        href = converted;
      } else {
        return;
      }
    }

    // Otherwise if this url is relative, navigate on the client
    event.preventDefault();

    // Attempt to route on the client
    let success: boolean | null = null;
    const routePromise = this.router.navigateByUrl(href);
    const timeoutPromise = delay(1000, false);

    try {
      success = await Promise.race([timeoutPromise, routePromise]);
    } finally {
      // This is in a click handler so it will only run on the client
      if (success) {
        // If successful scroll the window to the top
        window.scrollTo(0, 0);
      } else {
        // Otherwise handle the routing with a page refresh on failure. Angular, by deafult
        // if it fails to load a URL (e.g. if an API request failed when loading it), instead
        // of navigating to the new page to tell the user that their click did something but
        // the resulting page has an issue, it instead just silently fails and shows the user
        // nothing. Lets make sure we route to the new page. In some cases this even brings the
        // user to a correct and valid page anyway
        location.href = `${location.protocol}//${location.host}${href}`;
      }
    }
  }

  private isRelative(href: string) {
    return !href.match(/^(\/\/|https?:\/\/)/i);
  }

  // Attempt to convert an absolute url to relative if possible (aka if the hosts match)
  private convertToRelative(href: string) {
    const currentUrl = parse(location.href);
    const hrefUrl = parse(href);

    if (currentUrl.host === hrefUrl.host) {
      const relativeUrl = hrefUrl.pathname + (hrefUrl.search ? hrefUrl.search : '');
      return relativeUrl;
    }
  }

  private findHrefTarget(event: MouseEvent): HTMLAnchorElement | null {
    let element = event.target as HTMLElement | null;

    while (element) {
      if (element instanceof HTMLAnchorElement && element.getAttribute('href')) {
        return element;
      }

      if (element === event.currentTarget) {
        break;
      }

      element = element.parentElement;
    }

    return null;
  }
}
