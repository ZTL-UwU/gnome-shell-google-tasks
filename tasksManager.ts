import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
// @ts-expect-error: Goa types are not available
import Goa from 'gi://Goa';
// @ts-expect-error: Soup types are not available
import Soup from 'gi://Soup?version=3.0';

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: string;
  taskListId?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
}

interface GoogleTasksResponse {
  items?: GoogleTask[];
}

interface GoogleTaskListsResponse {
  items?: GoogleTaskList[];
}

Gio._promisify(Goa.Client, 'new', 'new_finish');
Gio._promisify(Goa.OAuth2Based.prototype, 'call_get_access_token', 'call_get_access_token_finish');
Gio._promisify(Soup.Session.prototype, 'send_and_read_async', 'send_and_read_finish');

export class GoogleTasksManager {
  private _cancellable: Gio.Cancellable;
  private _httpSession: Soup.Session;

  constructor() {
    this._cancellable = new Gio.Cancellable();
    this._httpSession = new Soup.Session();
  }

  private async _getAccessToken(): Promise<string> {
    const client = await Goa.Client.new(this._cancellable);
    const accounts = client.get_accounts();
    const googleAccount = accounts.find((acc: any) => acc.get_account().provider_type === 'google');
    if (!googleAccount)
      throw new Error('No Google account found in Online Accounts');
    const oauth2 = googleAccount.get_oauth2_based();
    if (!oauth2)
      throw new Error('Google account does not support OAuth2');
    const [accessToken] = await oauth2.call_get_access_token(this._cancellable);
    return accessToken;
  }

  async getTasks(): Promise<GoogleTask[]> {
    try {
      const accessToken = await this._getAccessToken();

      // Get Task Lists
      const listsUrl = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists';
      const listsData = await this._jsonRequest<GoogleTaskListsResponse>(listsUrl, accessToken);

      let allTasks: GoogleTask[] = [];
      if (listsData.items) {
        for (const list of listsData.items) {
          const tasksUrl = `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?showCompleted=false&showHidden=false`;
          try {
            const tasksData = await this._jsonRequest<GoogleTasksResponse>(tasksUrl, accessToken);
            if (tasksData.items) {
              const tasksWithListId = tasksData.items.map(t => ({ ...t, taskListId: list.id }));
              allTasks = allTasks.concat(tasksWithListId);
            }
          }
          catch (error) {
            console.error(`Google Tasks: Failed to fetch tasks for list ${list.title}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      return allTasks;
    }
    catch (e) {
      if (e instanceof GLib.Error && !e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
        console.error(`Google Tasks Error: ${e.message}`);
      }
      else if (e instanceof Error) {
        console.error(`Google Tasks Error: ${e.message}`);
      }
      return [];
    }
  }

  async createTask(title: string, notes?: string): Promise<void> {
    try {
      const accessToken = await this._getAccessToken();

      // Get the first task list
      const listsUrl = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists';
      const listsData = await this._jsonRequest<GoogleTaskListsResponse>(listsUrl, accessToken);
      if (!listsData.items || listsData.items.length === 0)
        throw new Error('No task lists found');

      const taskListId = listsData.items[0].id;
      const url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`;
      const body: Record<string, string> = { title };
      if (notes)
        body.notes = notes;
      await this._jsonRequest(url, accessToken, 'POST', body);
    }
    catch (e) {
      console.error(`Google Tasks: Failed to create task: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  async completeTask(taskListId: string, taskId: string): Promise<void> {
    try {
      const accessToken = await this._getAccessToken();

      const url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`;
      await this._jsonRequest(url, accessToken, 'PATCH', { status: 'completed' });
    }
    catch (e) {
      console.error(`Google Tasks: Failed to complete task: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  async updateTask(taskListId: string, taskId: string, title: string, notes?: string): Promise<void> {
    try {
      const accessToken = await this._getAccessToken();

      const url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`;
      const body: Record<string, string> = { title };
      if (notes !== undefined)
        body.notes = notes;
      await this._jsonRequest(url, accessToken, 'PATCH', body);
    }
    catch (e) {
      console.error(`Google Tasks: Failed to update task: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  async _jsonRequest<T>(url: string, token: string, method: string = 'GET', body?: object): Promise<T> {
    const message = Soup.Message.new(method, url);
    message.request_headers.append('Authorization', `Bearer ${token}`);

    if (body) {
      const bodyStr = JSON.stringify(body);
      const bytes = GLib.Bytes.new(new TextEncoder().encode(bodyStr));
      message.set_request_body_from_bytes('application/json', bytes);
    }

    const responseBytes = await this._httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, this._cancellable);
    const status = message.get_status();
    if (status !== 200) {
      throw new Error(`HTTP ${status}: ${message.get_reason_phrase()}`);
    }
    const data = responseBytes.get_data();
    if (!data)
      throw new Error('No data received');

    const responseBody = new TextDecoder().decode(data);
    return JSON.parse(responseBody) as T;
  }

  destroy() {
    this._cancellable.cancel();
  }
}
