/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ClickerName } from "@fluid-example/clicker";
import { PrimedComponent } from "@microsoft/fluid-aqueduct";
import { IComponentReactViewable } from "@microsoft/fluid-aqueduct-react";
import { ISharedCell, SharedCell } from "@microsoft/fluid-cell";
import { IComponentHandle, IComponentHTMLVisual } from "@microsoft/fluid-component-core-interfaces";
import { SharedString } from "@microsoft/fluid-sequence";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { TextBoxName } from "../TextBox";
import { TextListName } from "../TextList";
import { TodoItemSupportedComponents } from "./supportedComponent";
import { TodoItemView } from "./TodoItemView";

// tslint:disable-next-line: no-var-requires no-require-imports
const pkg = require("../../package.json");
export const TodoItemName = `${pkg.name as string}-item`;

const checkedKey = "checked";
const textKey = "text";
const innerComponentKey = "innerId";

/**
 * Todo Item is a singular todo entry consisting of:
 * - Checkbox
 * - Collaborative string
 * - Embedded component
 * - Link to open component in separate tab
 * - Button to remove entry
 */
export class TodoItem extends PrimedComponent
  implements
    IComponentHTMLVisual,
    IComponentReactViewable {

  // tslint:disable:prefer-readonly
  private text: SharedString;
  private innerIdCell: ISharedCell;
  // tslint:enable:prefer-readonly

  public get IComponentHTMLVisual() { return this; }
  public get IComponentReactViewable() { return this; }

  /**
   * Do creation work
   */
  protected async componentInitializingFirstTime(props?: any) {
    let newItemText = "New Item";

    // if the creating component passed props with a startingText value then set it.
    if (props && props.startingText) {
      newItemText = props.startingText;
    }

    // the text of the todo item
    const text = SharedString.create(this.runtime);
    text.insertText(0, newItemText);
    this.root.set(textKey, text.handle);

    // the state of the checkbox
    this.root.set(checkedKey, false);

    // Each Todo Item has one inner component that it can have. This value is originally empty since we let the
    // user choose the component they want to embed. We store it in a cell for easier event handling.
    const innerIdCell = SharedCell.create(this.runtime);
    innerIdCell.set(undefined);
    this.root.set(innerComponentKey, innerIdCell.handle);
  }

  protected async componentHasInitialized() {
    const text = this.root.get<IComponentHandle>(textKey).get<SharedString>();
    const innerIdCell = this.root.get<IComponentHandle>(innerComponentKey).get<ISharedCell>();

    this.setCheckedState = this.setCheckedState.bind(this);

    [
      this.text,
      this.innerIdCell,
    ] = await Promise.all([
      text,
      innerIdCell,
    ]);

    this.innerIdCell.on("op", (op, local) => {
      if (!local) {
        this.emit("innerComponentChanged");
      }
    });

    this.root.on("valueChanged", (op, local) => {
      if (!local) {
        if (op.key === checkedKey) {
          this.emit("checkedStateChanged");
        }
      }
    });
  }

  // start IComponentHTMLVisual

  public render(div: HTMLElement) {
    ReactDOM.render(
        this.createJSXElement(),
        div,
    );
  }

  // end IComponentHTMLVisual

  // start IComponentReactViewable

  /**
   * If our caller supports React they can query against the IComponentReactViewable
   * Since this returns a JSX.Element it allows for an easier model.
   */
  public createJSXElement(): JSX.Element {
      return (
        <TodoItemView
          todoItemModel={this}
        />
      );
  }

  // end IComponentReactViewable

  // start public API surface for the TodoItem model, used by the view

  // Would prefer not to hand this out, and instead give back a component?
  public getTodoItemText() {
    return this.text;
  }

  public setCheckedState(newState: boolean): void {
    this.root.set(checkedKey, newState);
    this.emit("checkedStateChanged");
  }

  public getCheckedState(): boolean {
    return this.root.get(checkedKey);
  }

  public hasInnerComponent(): boolean {
    return !!this.innerIdCell.get();
  }

  public async getInnerComponent() {
    const innerComponentId = this.innerIdCell.get();
    if (innerComponentId) {
      return this.getComponent(innerComponentId);
    } else {
      return undefined;
    }
  }

  /**
   * The Todo Item can embed multiple types of components. This is where these components are defined.
   * @param type - component to be created
   * @param props - props to be passed into component creation
   */
  public async createInnerComponent(type: TodoItemSupportedComponents, props?: any): Promise<void> {
    const id = `item${Date.now().toString()}`;

    switch (type) {
      case "todo":
          await this.createAndAttachComponent(id, TodoItemName, props);
          break;
      case "clicker":
          await this.createAndAttachComponent(id, ClickerName, props);
          break;
      case "textBox":
          await this.createAndAttachComponent(id, TextBoxName, props);
          break;
      case "textList":
          await this.createAndAttachComponent(id, TextListName, props);
          break;
      default:
    }

    // Update the inner component id
    this.innerIdCell.set(id);

    this.emit("innerComponentChanged");
  }

  // end public API surface for the TodoItem model, used by the view
}
