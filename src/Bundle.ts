import { Container, ContainerBuilder, Extension } from '@raegon/dependency-injection';

export abstract class Bundle {

    protected container!: Container;

    public getName(): string {
        return this.constructor.name;

    }

    public getContainerExtension(): Extension|null {
        return null;
    }

    public getPath(): string {
        return '';
    }
    public getNamespace() {
        return '';
    }

    public setContainer(container: Container): void {
        this.container = container;
    }

    // tslint:disable-next-line:no-empty
    public build(container: ContainerBuilder): void {}

    // tslint:disable-next-line:no-empty
    public boot(): void|Promise<void> {}


    // tslint:disable-next-line:no-empty
    public shutdown() {}

}

export default Bundle;
