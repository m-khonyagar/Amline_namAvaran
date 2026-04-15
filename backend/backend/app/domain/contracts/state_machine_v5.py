class StateMachine:
    def __init__(self):
        self.states = [
            'state_1', 'state_2', 'state_3', 'state_4', 'state_5',
            'state_6', 'state_7', 'state_8', 'state_9', 'state_10',
            'state_11', 'state_12', 'state_13', 'state_14', 'state_15',
            'state_16', 'state_17', 'state_18', 'state_19', 'state_20'
        ]
        self.transitions = [
            ('state_1', 'state_2', 'guard_condition_1'),
            ('state_2', 'state_3', 'guard_condition_2'),
            ('state_3', 'state_4', 'guard_condition_3'),
            ('state_4', 'state_5', 'guard_condition_4'),
            ('state_5', 'state_6', 'guard_condition_5'),
            ('state_6', 'state_7', 'guard_condition_6'),
            ('state_7', 'state_8', 'guard_condition_7'),
            ('state_8', 'state_9', 'guard_condition_8'),
            ('state_9', 'state_10', 'guard_condition_9'),
            ('state_10', 'state_11', 'guard_condition_10'),
            ('state_11', 'state_12', 'guard_condition_11'),
            ('state_12', 'state_13', 'guard_condition_12'),
            ('state_13', 'state_14', 'guard_condition_13'),
            ('state_14', 'state_15', 'guard_condition_14'),
            ('state_15', 'state_16', 'guard_condition_15'),
            ('state_16', 'state_17', 'guard_condition_16'),
            ('state_17', 'state_18', 'guard_condition_17'),
            ('state_18', 'state_19', 'guard_condition_18'),
            ('state_19', 'state_20', 'guard_condition_19'),
            ('state_20', 'state_1', 'guard_condition_20')
        ]
        self.current_state = 'state_1'
        self.sla_deadlines = {}

    def set_sla(self, state, deadline):
        self.sla_deadlines[state] = deadline

    def get_sla(self, state):
        return self.sla_deadlines.get(state, None)

    def transition(self, condition):
        for transition in self.transitions:
            if transition[0] == self.current_state and condition == transition[2]:
                self.current_state = transition[1]
                print(f'Transitioned to {self.current_state}')
                return
        raise ValueError(
            f'Transition not allowed: no edge from "{self.current_state}" with condition "{condition}"'
        )

    def get_current_state(self):
        return self.current_state

# Example of using the state machine
if __name__ == '__main__':
    sm = StateMachine()  
    sm.set_sla('state_1', '2026-04-15 04:12:24')
    print(sm.get_current_state())  
    sm.transition('guard_condition_1')  
    print(sm.get_current_state())  
    print(sm.get_sla('state_1'))
