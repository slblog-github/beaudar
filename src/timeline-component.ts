import { User, Issue, IssueComment } from './github';
import { CommentComponent } from './comment-component';
import { scheduleMeasure } from './measure';
import { pageAttributes as page } from './page-attributes';

export class TimelineComponent {
  public readonly element: HTMLElement;
  private readonly timeline: CommentComponent[] = [];
  private readonly countAnchor: HTMLAnchorElement;
  private readonly marker: Node;
  private count: number = 0;
  private readonly isDesc: boolean = false;

  constructor(private user: User | null, private issue: Issue | null) {
    this.element = document.createElement('main');
    this.element.classList.add('timeline');
    this.element.innerHTML = `
      <h1 class="timeline-header">
        <a class="text-link" target="_blank"></a>
      </h1>`;
    this.countAnchor = this.element.firstElementChild!
      .firstElementChild as HTMLAnchorElement;
    this.marker = document.createComment('marker');
    this.element.appendChild(this.marker);
    this.setIssue(this.issue);
    this.renderCount();
    this.isDesc = page.commentOrder === 'desc';
  }

  public setUser(user: User | null) {
    this.user = user;
    const login = user ? user.login : null;
    for (let i = 0; i < this.timeline.length; i++) {
      this.timeline[i].setCurrentUser(login);
    }
    scheduleMeasure();
  }

  public setIssue(issue: Issue | null) {
    this.issue = issue;
    if (issue) {
      this.count = issue.comments;
      this.countAnchor.href = issue.html_url;
      this.renderCount();
    } else {
      this.countAnchor.removeAttribute('href');
    }
  }

  public insertComment(comment: IssueComment, incrementCount: boolean) {
    const component = new CommentComponent(
      comment,
      this.user ? this.user.login : null,
      this.issue!.locked,
    );

    const index = this.timeline.findIndex((x) => {
      if (this.isDesc) {
        return x.comment.id <= comment.id;
      } else {
        return x.comment.id >= comment.id;
      }
    });

    if (index === -1) {
      this.timeline.push(component);
      this.element.insertBefore(component.element, this.marker);
    } else {
      const next = this.timeline[index];
      const remove = next.comment.id === comment.id;
      this.element.insertBefore(component.element, next.element);
      this.timeline.splice(index, remove ? 1 : 0, component);
      if (remove) {
        next.element.remove();
      }
    }

    if (incrementCount) {
      this.count++;
      this.renderCount();
    }

    scheduleMeasure();
  }

  public insertPageLoader(
    insertAfter: IssueComment,
    count: number,
    callback: () => void,
  ) {
    const { element: insertAfterElement } = this.timeline.find((x) => {
      if (this.isDesc) {
        return x.comment.id <= insertAfter.id;
      } else {
        return x.comment.id >= insertAfter.id;
      }
    })!;
    const insert = this.isDesc ? 'beforebegin' : 'afterend';
    insertAfterElement.insertAdjacentHTML(
      insert,
      `
      <div class="page-loader">
        <div class="zigzag"></div>
        <button type="button" class="btn btn-outline btn-large">
          ${count} 条评论被收起<br/>
          <span>加载更多</span>
        </button>
      </div>
    `,
    );
    const sibling = this.isDesc
      ? 'previousElementSibling'
      : 'nextElementSibling';
    const element = insertAfterElement[sibling]!;
    const button = element.lastElementChild! as HTMLButtonElement;
    const statusSpan = button.lastElementChild!;
    button.onclick = callback;

    return {
      setBusy() {
        statusSpan.textContent = '加载中…';
        button.disabled = true;
      },
      remove() {
        button.onclick = null;
        element.remove();
      },
    };
  }

  private renderCount() {
    this.countAnchor.textContent = `${
      this.count >= 1 ? `${this.count} 条评论` : '还没有评论'
    }`;
  }
}
