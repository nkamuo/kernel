import { CompilerPass, ContainerBuilder } from '@raegon/dependency-injection';

export class AddEventAliasesPass implements CompilerPass
{
    private eventAliases;
    private eventAliasesParameter;

    public constructor(eventAliases: string[],eventAliasesParameter = 'event_dispatcher.event_aliases')
    {
        if (1 < arguments.length) {
            console.warn('@raegon/kernel', '5.3', `Configuring "${this.constructor.name}" is deprecated.`);
        }

        this.eventAliases = eventAliases;
        this.eventAliasesParameter = eventAliasesParameter;
    }

    public  process(container: ContainerBuilder): void
    {
        const eventAliases = container.hasParameter(this.eventAliasesParameter) ? container.getParameter(this.eventAliasesParameter) : [];

        container.setParameter(
            this.eventAliasesParameter,
            (eventAliases.concat(this.eventAliases))
        );
    }
}
